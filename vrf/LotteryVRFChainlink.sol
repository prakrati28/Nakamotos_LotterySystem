// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title  Commit Reveal Lottery (Multi-Round) — Chainlink VRF v2.5 Randomness
 * On-chain (required for contract logic):
 * - Ticket IDs and participant wallet addresses per round
 * - Phase enum per round
 * - VRF request ID mapped to round ID
 * - Winner address, prize pool amount per round
 *
 * Off-chain (never stored here):
 * - Any personal / KYC details linked to wallet addresses
 *
 * NOTE: Ownership is provided by VRFConsumerBaseV2Plus → ConfirmedOwner.
 *       Do NOT also inherit OZ Ownable — they clash on owner(), onlyOwner, etc.
 */
contract Lottery is ReentrancyGuard, VRFConsumerBaseV2Plus {
    enum Phase {
        Open,            // Tickets on sale
        SaleClosed,      // No more tickets; waiting for owner to request randomness
        Committed,       // VRF request sent; waiting for Chainlink to fulfill
        Drawn,           // Winner selected; prize claimable
        Slashed          // Phase triggered if VRF fulfillment never arrives (fallback safety)
    }

    uint256 public immutable s_subscriptionId;
    bytes32 public immutable s_keyHash;
    uint32  public constant  CALLBACK_GAS_LIMIT   = 100_000;
    uint16  public constant  REQUEST_CONFIRMATIONS = 3;
    uint32  public constant  NUM_WORDS             = 1;

    // Maps a VRF requestId → the round it was made for
    mapping(uint256 => uint256) public vrfRequestToRound;

    // Maps round → the VRF requestId (so anyone can check on-chain)
    mapping(uint256 => uint256) public roundVrfRequest;

    uint256 public ticketPrice;
    uint256 public currentRound;

    // --- State variables mapped by round ID ---
    mapping(uint256 => Phase)   public phase;
    mapping(uint256 => address[]) private participants;
    mapping(uint256 => address) public winner;
    mapping(uint256 => uint256) public prizePool;
    mapping(uint256 => uint256) public targetBlock;
    mapping(uint256 => mapping(address => uint256)) public userTickets;
    mapping(uint256 => bool)    public prizeClaimed;

    // --- Events (unchanged) ---
    event RoundStarted(uint256 indexed roundId);
    event TicketPurchased(uint256 indexed roundId, address indexed buyer, uint256 ticketId);
    event SaleClosed(uint256 indexed roundId);
    event HashCommitted(uint256 indexed roundId, bytes32 indexed hash);
    event WinnerDrawn(uint256 indexed roundId, address indexed winner, uint256 prizeAmount);
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event OwnerSlashed(uint256 indexed roundId);
    event RefundClaimed(uint256 indexed roundId, address indexed participant, uint256 amount);

    /**
     * @param _ticketPrice    Price per ticket in wei.
     * @param _vrfCoordinator Chainlink VRF Coordinator address for your network.
     * @param _subscriptionId Your funded Chainlink VRF v2.5 subscription ID.
     * @param _keyHash        The gas-lane key hash for your network.
     *
     * Example addresses (Ethereum Sepolia):
     *   coordinator : 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
     *   keyHash     : 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae
     */
    constructor(
        uint256 _ticketPrice,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    )
        VRFConsumerBaseV2Plus(_vrfCoordinator)
    {
        require(_ticketPrice > 0, "Lottery: ticket price must be > 0");
        ticketPrice      = _ticketPrice;
        s_subscriptionId = _subscriptionId;
        s_keyHash        = _keyHash;

        currentRound = 1;
        phase[currentRound] = Phase.Open;
        emit RoundStarted(currentRound);
    }

    // Round management

    function startNewRound() external onlyOwner {
        require(
            phase[currentRound] == Phase.Drawn || phase[currentRound] == Phase.Slashed,
            "Lottery: current round not finished"
        );

        currentRound++;
        phase[currentRound] = Phase.Open;

        emit RoundStarted(currentRound);
    }


    function buyTicket() external payable {
        require(phase[currentRound] == Phase.Open, "Lottery: sale is closed");
        require(msg.value == ticketPrice, "Lottery: incorrect ticket price");

        uint256 ticketId = participants[currentRound].length;
        participants[currentRound].push(msg.sender);
        prizePool[currentRound] += msg.value;
        userTickets[currentRound][msg.sender]++;

        emit TicketPurchased(currentRound, msg.sender, ticketId);
    }

    function closeSale() external onlyOwner {
        require(phase[currentRound] == Phase.Open, "Lottery: sale is not open");
        require(participants[currentRound].length > 0, "Lottery: no participants to close sale for");

        phase[currentRound] = Phase.SaleClosed;
        emit SaleClosed(currentRound);
    }

    // Chainlink VRF replaces commitHash , revealAndDraw

    /**
     * @notice Owner requests a verifiable random word from Chainlink VRF.
     *         Replaces the old commitHash() step.
     *         Phase transition: SaleClosed → Committed
     */
    function requestDraw() external onlyOwner {
        require(phase[currentRound] == Phase.SaleClosed, "Lottery: must close sale first");
        require(participants[currentRound].length > 0,   "Lottery: no participants");

        targetBlock[currentRound] = block.number;

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash:              s_keyHash,
                subId:                s_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit:     CALLBACK_GAS_LIMIT,
                numWords:             NUM_WORDS,
                extraArgs:            VRFV2PlusClient._argsToBytes(
                                          VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                                      )
            })
        );

        vrfRequestToRound[requestId]  = currentRound;
        roundVrfRequest[currentRound] = requestId;

        phase[currentRound] = Phase.Committed;

        emit HashCommitted(currentRound, bytes32(requestId));
    }

    /**
     * @notice Called by Chainlink VRF Coordinator once randomness is ready.
     *         Selects winner deterministically from the verified random word.
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 roundId = vrfRequestToRound[requestId];

        require(phase[roundId] == Phase.Committed, "Lottery: round not in committed phase");

        uint256 totalParticipants = participants[roundId].length;
        uint256 winnerIndex       = randomWords[0] % totalParticipants;

        winner[roundId] = participants[roundId][winnerIndex];
        phase[roundId]  = Phase.Drawn;

        emit WinnerDrawn(roundId, winner[roundId], prizePool[roundId]);
    }

    // Slash

    function slashOwner() external {
        require(phase[currentRound] == Phase.Committed,         "Lottery: not in committed phase");
        require(block.number > targetBlock[currentRound] + 256, "Lottery: reveal deadline not passed");

        phase[currentRound] = Phase.Slashed;
        emit OwnerSlashed(currentRound);
    }

    // Prize & refund

    function claimPrize(uint256 _roundId) external nonReentrant {
        require(phase[_roundId] == Phase.Drawn,   "Lottery: prize not yet available");
        require(msg.sender == winner[_roundId],   "Lottery: caller is not the winner");
        require(!prizeClaimed[_roundId],          "Lottery: prize already claimed");

        uint256 payout = prizePool[_roundId];
        prizePool[_roundId]    = 0;
        prizeClaimed[_roundId] = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(_roundId, msg.sender, payout);
    }

    function claimRefund(uint256 _roundId) external nonReentrant {
        require(phase[_roundId] == Phase.Slashed, "Lottery: owner not slashed");

        uint256 tickets = userTickets[_roundId][msg.sender];
        require(tickets > 0, "Lottery: no tickets to refund");

        userTickets[_roundId][msg.sender] = 0;

        uint256 refundAmount = (tickets * prizePool[_roundId]) / participants[_roundId].length;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    // View helpers 

    function totalTickets(uint256 _roundId) external view returns (uint256) {
        return participants[_roundId].length;
    }

    function getParticipant(uint256 _roundId, uint256 index) external view returns (address) {
        require(index < participants[_roundId].length, "Lottery: index out of bounds");
        return participants[_roundId][index];
    }
}