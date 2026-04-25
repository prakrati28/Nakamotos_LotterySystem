// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Lottery is Ownable, ReentrancyGuard {

    enum Phase {
        Open,
        SaleClosed,
        Committed,
        Drawn,
        Slashed
    }

    struct Round {
        address winner;
        Phase   phase;
        bool    prizeClaimed;

        bytes32 committedHash;
        uint256 prizePool;
        uint256 targetBlock;
        uint256 lockedCollateral;

        address[]                   participants;
        mapping(address => uint256) userTickets;
    }

    uint256 public ticketPrice;
    uint256 public currentRound;

    mapping(uint256 => Round) private rounds;
    
    event RoundStarted(uint256 indexed roundId);
    event TicketPurchased(uint256 indexed roundId, address indexed buyer, uint256 ticketId);
    event SaleClosed(uint256 indexed roundId);
    event HashCommitted(uint256 indexed roundId, bytes32 indexed hash);
    event WinnerDrawn(uint256 indexed roundId, address indexed winner, uint256 prizeAmount);
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event OwnerSlashed(uint256 indexed roundId);
    event RefundClaimed(uint256 indexed roundId, address indexed participant, uint256 amount);

    /**
     * @notice Initializes the lottery contract and starts the first round.
     * @param _ticketPrice The cost to purchase a single ticket in wei.
     */
    constructor(uint256 _ticketPrice) Ownable(msg.sender) {
        require(_ticketPrice > 0, "Lottery: ticket price must be > 0");
        ticketPrice  = _ticketPrice;
        currentRound = 1;
        rounds[currentRound].phase = Phase.Open;
        emit RoundStarted(currentRound);
    }

    /**
     * @notice Starts a new lottery round.
     * @dev Can only be called by the owner when the current round is Drawn or Slashed.
     */
    function startNewRound() external onlyOwner {
        require(
            rounds[currentRound].phase == Phase.Drawn ||
            rounds[currentRound].phase == Phase.Slashed,
            "Lottery: current round not finished"
        );
        currentRound++;
        rounds[currentRound].phase = Phase.Open;
        emit RoundStarted(currentRound);
    }

    /**
     * @notice Allows a user to purchase a ticket for the current round.
     * @dev Requires the sent value to exactly match the ticket price and the phase to be Open.
     */
    function buyTicket() external payable {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open,  "Lottery: sale is closed");
        require(msg.value == ticketPrice,   "Lottery: incorrect ticket price");
        
        uint256 ticketId = round.participants.length;
        round.participants.push(msg.sender);
        round.prizePool += msg.value;
        round.userTickets[msg.sender]++;

        emit TicketPurchased(currentRound, msg.sender, ticketId);
    }

    /**
     * @notice Closes the ticket sale for the current round.
     * @dev Can only be called by the owner when the phase is Open and there are participants.
     */
    function closeSale() external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open,       "Lottery: sale is not open");
        require(round.participants.length > 0,   "Lottery: no participants to close sale for");
        
        round.phase = Phase.SaleClosed;
        emit SaleClosed(currentRound);
    }

    /**
     * @notice Commits the hashed secret and locks the owner's collateral.
     * @dev Sets the target block for the reveal phase.
     * @param _hash The keccak256 hash of the secret.
     */
    function commitHash(bytes32 _hash) external payable onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.SaleClosed, "Lottery: must close sale first");
        require(_hash != bytes32(0),             "Lottery: hash cannot be zero");
        require(round.participants.length > 0,   "Lottery: no participants");
        require(msg.value == round.prizePool, "Lottery: collateral must match the prize pool");
        
        round.lockedCollateral = msg.value;
        round.targetBlock      = block.number + 10;
        round.committedHash    = _hash;
        round.phase            = Phase.Committed;

        emit HashCommitted(currentRound, _hash);
    }

    /**
     * @notice Reveals the secret, draws a winner, and refunds the owner's collateral.
     * @dev Validates the secret against the committed hash and uses the target blockhash for randomness.
     * @param _secret The plaintext secret used to generate the committed hash.
     */
    function revealAndDraw(bytes32 _secret) external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed, "Lottery: not in committed phase");
        
        uint256 _targetBlock = round.targetBlock;
        require(block.number > _targetBlock, "Lottery: target block not mined yet");
        require(block.number <= _targetBlock + 250, "Lottery: blockhash expired");

        require(
            keccak256(abi.encodePacked(_secret)) == round.committedHash,
            "Lottery: secret does not match committed hash"
        );
        
        uint256 totalParticipants = round.participants.length;
        bytes32 futureBlockHash = blockhash(_targetBlock);
        require(futureBlockHash != bytes32(0), "Lottery: blockhash is zero");

        uint256 winnerIndex;
        unchecked {
            winnerIndex = uint256(
                keccak256(
                    abi.encodePacked(_secret, futureBlockHash, totalParticipants)
                )
            ) % totalParticipants;
        }

        address _winner = round.participants[winnerIndex];
        round.winner = _winner;
        round.phase = Phase.Drawn;

        uint256 collateralToReturn = round.lockedCollateral;
        round.lockedCollateral = 0;
        
        uint256 _prizePool = round.prizePool;
        
        (bool success, ) = msg.sender.call{value: collateralToReturn}("");
        require(success, "Lottery: collateral return failed");

        emit WinnerDrawn(currentRound, _winner, _prizePool);
    }

    /**
     * @notice Penalizes the owner if they fail to reveal the secret within the deadline.
     * @dev Transitions the round to the Slashed phase, allowing users to claim refunds.
     */
    function slashOwner() external {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed,         "Lottery: not in committed phase");
        require(block.number > round.targetBlock + 250, "Lottery: reveal deadline not passed");
        
        round.phase = Phase.Slashed;
        emit OwnerSlashed(currentRound);
    }

    /**
     * @notice Allows the winner of a drawn round to claim their prize.
     * @dev Protects against reentrancy and ensures the prize is only claimed once.
     * @param _roundId The ID of the round to claim the prize for.
     */
    function claimPrize(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.phase == Phase.Drawn,   "Lottery: prize not yet available");
        require(msg.sender == round.winner,   "Lottery: caller is not the winner");
        require(!round.prizeClaimed,          "Lottery: prize already claimed");
        
        uint256 payout     = round.prizePool;
        round.prizePool    = 0;
        round.prizeClaimed = true;
        
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(_roundId, msg.sender, payout);
    }

    /**
     * @notice Allows a participant to claim a proportional refund if the owner was slashed.
     * @dev Calculates refund based on ticket share of the prize pool and locked collateral.
     * @param _roundId The ID of the slashed round.
     */
    function claimRefund(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.phase == Phase.Slashed, "Lottery: owner not slashed");

        uint256 tickets = round.userTickets[msg.sender];
        require(tickets > 0,                 "Lottery: no tickets to refund");
        
        round.userTickets[msg.sender] = 0;

        uint256 totalFundsAvailable = round.prizePool + round.lockedCollateral;
        uint256 refundAmount = (tickets * totalFundsAvailable) / round.participants.length;
        
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    /**
     * @notice Gets the total number of tickets sold for a given round.
     * @param _roundId The ID of the round.
     * @return The number of participants/tickets in the round.
     */
    function totalTickets(uint256 _roundId) external view returns (uint256) {
        return rounds[_roundId].participants.length;
    }

    /**
     * @notice Gets the participant address at a specific index for a given round.
     * @param _roundId The ID of the round.
     * @param index The zero-based index of the participant.
     * @return The address of the ticket holder.
     */
    function getParticipant(uint256 _roundId, uint256 index) external view returns (address) {
        require(index < rounds[_roundId].participants.length, "Lottery: index out of bounds");
        return rounds[_roundId].participants[index];
    }

    /**
     * @notice Gets the current phase of a given round.
     * @param _roundId The ID of the round.
     * @return The current Phase enum value.
     */
    function phase(uint256 _roundId) external view returns (Phase) { 
        return rounds[_roundId].phase; 
    }

    /**
     * @notice Gets the committed hash for a given round.
     * @param _roundId The ID of the round.
     * @return The bytes32 committed hash.
     */
    function committedHash(uint256 _roundId) external view returns (bytes32) { 
        return rounds[_roundId].committedHash; 
    }

    /**
     * @notice Gets the winning address for a given round.
     * @param _roundId The ID of the round.
     * @return The address of the round's winner.
     */
    function winner(uint256 _roundId) external view returns (address) { 
        return rounds[_roundId].winner; 
    }

    /**
     * @notice Gets the total prize pool accumulated for a given round.
     * @param _roundId The ID of the round.
     * @return The total prize pool amount in wei.
     */
    function prizePool(uint256 _roundId) external view returns (uint256) { 
        return rounds[_roundId].prizePool; 
    }

    /**
     * @notice Gets the target block number required for the reveal phase of a given round.
     * @param _roundId The ID of the round.
     * @return The target block number.
     */
    function targetBlock(uint256 _roundId) external view returns (uint256) { 
        return rounds[_roundId].targetBlock; 
    }

    /**
     * @notice Gets the amount of collateral locked by the owner for a given round.
     * @param _roundId The ID of the round.
     * @return The locked collateral amount in wei.
     */
    function lockedCollateral(uint256 _roundId) external view returns (uint256) { 
        return rounds[_roundId].lockedCollateral; 
    }

    /**
     * @notice Checks if the prize for a given round has been claimed.
     * @param _roundId The ID of the round.
     * @return A boolean indicating whether the prize is claimed.
     */
    function prizeClaimed(uint256 _roundId) external view returns (bool) { 
        return rounds[_roundId].prizeClaimed; 
    }

    /**
     * @notice Gets the number of tickets purchased by a specific user in a given round.
     * @param _roundId The ID of the round.
     * @param _user The address of the participant.
     * @return The number of tickets held by the user.
     */
    function userTickets(uint256 _roundId, address _user) external view returns (uint256) { 
        return rounds[_roundId].userTickets[_user]; 
    }
}