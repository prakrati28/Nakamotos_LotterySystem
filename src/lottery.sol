// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  Commit Reveal Lottery (Multi-Round)
 * On-chain (required for contract logic):
 * - Ticket IDs and participant wallet addresses per round
 * - Phase enum per round
 * - Committed hash (bytes32 keccak256 of the secret) per round
 * - Winner address, prize pool amount per round
 *
 * Off-chain (never stored here):
 * - The raw secret — kept off-chain until reveal, and even then only
 * passes through calldata transiently (never written to storage)
 * - Any personal / KYC details linked to wallet addresses
 */

contract Lottery is Ownable, ReentrancyGuard {
    enum Phase {
        Open,            // Tickets on sale
        SaleClosed,      // No more tickets; waiting for owner to commit
        Committed,       // Owner committed keccak256(secret); waiting for reveal
        Drawn,           // Winner selected; prize claimable
        Slashed          // Phase triggered if owner withholds reveal
    }
    
    uint256 public ticketPrice;
    uint256 public currentRound;

    // --- State variables are now mapped by round ID ---
    mapping(uint256 => Phase) public phase;
    mapping(uint256 => address[]) private participants; 
    mapping(uint256 => bytes32) public committedHash;
    mapping(uint256 => address) public winner;
    mapping(uint256 => uint256) public prizePool;      
    mapping(uint256 => uint256) public targetBlock;
    mapping(uint256 => uint256) public lockedCollateral;
    mapping(uint256 => mapping(address => uint256)) public userTickets;
    mapping(uint256 => bool) public prizeClaimed; 
    
    // --- Events now include the roundId ---
    event RoundStarted(uint256 indexed roundId);
    event TicketPurchased(uint256 indexed roundId, address indexed buyer, uint256 ticketId);
    event SaleClosed(uint256 indexed roundId);
    event HashCommitted(uint256 indexed roundId, bytes32 indexed hash);
    event WinnerDrawn(uint256 indexed roundId, address indexed winner, uint256 prizeAmount);
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event OwnerSlashed(uint256 indexed roundId);
    event RefundClaimed(uint256 indexed roundId, address indexed participant, uint256 amount);

    constructor(uint256 _ticketPrice) Ownable(msg.sender) {
        require(_ticketPrice > 0, "Lottery: ticket price must be > 0");
        ticketPrice = _ticketPrice;
        
        // Initialize the first round
        currentRound = 1;
        phase[currentRound] = Phase.Open;
        emit RoundStarted(currentRound);
    }

    /**
     * @notice Starts a brand new lottery round.
     * Requires the current round to be finished (Drawn or Slashed).
     */
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
        require(phase[currentRound] == Phase.Open, "Lottery: sale is closed");              // sale must be in open phase
        require(msg.value == ticketPrice, "Lottery: incorrect ticket price");               // ticket price must match

        uint256 ticketId = participants[currentRound].length;                               // effects
        participants[currentRound].push(msg.sender);
        prizePool[currentRound] += msg.value;
        userTickets[currentRound][msg.sender]++; // Track individual ticket counts for refunds

        emit TicketPurchased(currentRound, msg.sender, ticketId);
    }

    /**
     * @notice Owner closes ticket sales, advancing phase to SaleClosed.
     * Must be called before commitHash().
     */
    function closeSale() external onlyOwner {
        require(phase[currentRound] == Phase.Open, "Lottery: sale is not open");
        require(participants[currentRound].length > 0, "Lottery: no participants to close sale for");

        phase[currentRound] = Phase.SaleClosed;
        emit SaleClosed(currentRound);
    }

    /*
      @notice Owner submits keccak256(abi.encodePacked(secret)) to lock in
      commit reveal to prevent frontrunning
      @param  hash:  keccak256(abi.encodePacked(secret)) — computed off-chain.
     */
    function commitHash(bytes32 _hash) external payable onlyOwner {
        require(phase[currentRound] == Phase.SaleClosed, "Lottery: must close sale first");           // lottery sale should be closed
        require(_hash != bytes32(0), "Lottery: hash cannot be zero");                                 // hash is non zero to prevent empty commit
        require(participants[currentRound].length > 0, "Lottery: no participants");
        require(msg.value > 0, "Lottery: must deposit collateral");                                   // Enforce penalty stake

        lockedCollateral[currentRound] = msg.value;                                                   // Lock the penalty funds
        targetBlock[currentRound] = block.number + 10;                                                // will require the blockhash 10 blocks from now

        committedHash[currentRound] = _hash;
        phase[currentRound] = Phase.Committed;

        emit HashCommitted(currentRound, _hash);
    }

      //@param  _secret  The raw secret value committed to via commitHash().   Passes through calldata only; never written to storage.
      //  Owner reveals the secret, verifies it against the committed. Hash, draws the winner deterministically.
    function revealAndDraw(bytes32 _secret) external onlyOwner {
        require(phase[currentRound] == Phase.Committed, "Lottery: not in committed phase");               // phase must be in commit
        require(block.number > targetBlock[currentRound], "Lottery: target block not mined yet");         // Wait for target block
        require(block.number <= targetBlock[currentRound] + 250, "Lottery: blockhash expired");           // Enforce reveal deadline

        // Verify the secret matches what was committed revert if not
        require(
            keccak256(abi.encodePacked(_secret)) == committedHash[currentRound],
            "Lottery: secret does not match committed hash"
        );

        // Cache storage read (gas optimisation — avoids repeated SLOAD).
        uint256 totalParticipants = participants[currentRound].length;

        // Fetch the future blockhash
        bytes32 futureBlockHash = blockhash(targetBlock[currentRound]);
        require(futureBlockHash != bytes32(0), "Lottery: blockhash is zero");

        uint256 winnerIndex = uint256(
            keccak256(
                abi.encodePacked(
                    _secret,
                    futureBlockHash,
                    totalParticipants
                )
            )
        ) % totalParticipants;


        winner[currentRound] = participants[currentRound][winnerIndex];
        phase[currentRound]  = Phase.Drawn;
        
        // Return collateral to the honest owner
        uint256 collateralToReturn = lockedCollateral[currentRound];
        lockedCollateral[currentRound] = 0;
        (bool success, ) = msg.sender.call{value: collateralToReturn}("");
        require(success, "Lottery: collateral return failed");

        emit WinnerDrawn(currentRound, winner[currentRound], prizePool[currentRound]);
    }

    function slashOwner() external {
        require(phase[currentRound] == Phase.Committed, "Lottery: not in committed phase");
        require(block.number > targetBlock[currentRound] + 250, "Lottery: reveal deadline not passed");
        
        phase[currentRound] = Phase.Slashed;
        emit OwnerSlashed(currentRound);
    }

    /**
     * @notice Winner calls this to withdraw the entire prize pool for a specific round.
     * Protected by ReentrancyGuard (inherits from OZ).
     * Follows checks-effects-interactions pattern.
     */
    function claimPrize(uint256 _roundId) external nonReentrant {
        // Access control — only the drawn winner may claim
        require(phase[_roundId] == Phase.Drawn, "Lottery: prize not yet available");
        require(msg.sender == winner[_roundId], "Lottery: caller is not the winner");
        require(!prizeClaimed[_roundId], "Lottery: prize already claimed");

        // Effects before interaction (CEI pattern)
        uint256 payout = prizePool[_roundId];
        prizePool[_roundId]    = 0;
        prizeClaimed[_roundId] = true;

        // Interaction — send ETH last
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(_roundId, msg.sender, payout);
    }

    function claimRefund(uint256 _roundId) external nonReentrant {
        require(phase[_roundId] == Phase.Slashed, "Lottery: owner not slashed");          // lottery must be in slashed phase to get a refund
        
        uint256 tickets = userTickets[_roundId][msg.sender];
        require(tickets > 0, "Lottery: no tickets to refund");

        userTickets[_roundId][msg.sender] = 0;                                            // Prevent re-claiming

        // Proportional refund: Ticket Cost + Cut of Owner's Collateral
        uint256 totalFundsAvailable = prizePool[_roundId] + lockedCollateral[_roundId];
        uint256 refundAmount = (tickets * totalFundsAvailable) / participants[_roundId].length;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    // View helpers

    /// @notice Returns the total number of tickets sold for a specific round.
    function totalTickets(uint256 _roundId) external view returns (uint256) {
        return participants[_roundId].length;
    }

    /// @notice Returns the ticket holder at a given index (ticket ID) for a specific round.
    function getParticipant(uint256 _roundId, uint256 index) external view returns (address) {
        require(index < participants[_roundId].length, "Lottery: index out of bounds");
        return participants[_roundId][index];
    }
}