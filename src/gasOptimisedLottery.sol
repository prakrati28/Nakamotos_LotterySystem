// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  Commit Reveal Lottery (Multi-Round)
 * @notice A transparent, on-chain lottery system utilizing a commit-reveal scheme.
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
    
    struct Round {
        // SLOT 0: 22 bytes used (fits inside 32 bytes to save SLOAD/SSTORE costs)
        address winner;             // 20 bytes
        Phase phase;                // 1 byte
        bool prizeClaimed;          // 1 byte
        
        // SLOT 1 - 4
        bytes32 committedHash;      // 32 bytes
        uint256 prizePool;          // 32 bytes
        uint256 targetBlock;        // 32 bytes
        uint256 lockedCollateral;   // 32 bytes
        
        // Dynamic Data
        address[] participants; 
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
     * @param _ticketPrice The cost to buy a single lottery ticket in wei.
     */
    constructor(uint256 _ticketPrice) Ownable(msg.sender) {
        require(_ticketPrice > 0, "Lottery: ticket price must be > 0");
        ticketPrice = _ticketPrice;
        
        // Initialize the first round
        currentRound = 1;
        rounds[currentRound].phase = Phase.Open;
        emit RoundStarted(currentRound);
    }

    /**
     * @notice Starts a brand new lottery round.
     * @dev Requires the current round to be finished (in Drawn or Slashed phase).
     */
    function startNewRound() external onlyOwner {
        require(
            rounds[currentRound].phase == Phase.Drawn || rounds[currentRound].phase == Phase.Slashed,
            "Lottery: current round not finished"
        );
        
        currentRound++;
        rounds[currentRound].phase = Phase.Open;
        
        emit RoundStarted(currentRound);
    }

    /**
     * @notice Allows a user to purchase a lottery ticket for the current round.
     * @dev User must send exactly the `ticketPrice` in msg.value. Updates prize pool and participant tracking.
     */
    function buyTicket() external payable {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open, "Lottery: sale is closed");              
        require(msg.value == ticketPrice, "Lottery: incorrect ticket price");                

        uint256 ticketId = round.participants.length;                                
        round.participants.push(msg.sender);
        round.prizePool += msg.value;
        round.userTickets[msg.sender]++; 

        emit TicketPurchased(currentRound, msg.sender, ticketId);
    }

    /**
     * @notice Owner closes ticket sales, advancing phase to SaleClosed.
     * @dev Must be called before commitHash(). Reverts if there are no participants.
     */
    function closeSale() external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open, "Lottery: sale is not open");
        require(round.participants.length > 0, "Lottery: no participants to close sale for");

        round.phase = Phase.SaleClosed;
        emit SaleClosed(currentRound);
    }

    /**
     * @notice Owner submits a hash to lock in the commit-reveal phase and prevent frontrunning.
     * @dev Requires msg.value as locked collateral to ensure the owner reveals. Sets targetBlock for future blockhash.
     * @param _hash The keccak256 hash of the abi-encoded secret (computed off-chain).
     */
    function commitHash(bytes32 _hash) external payable onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.SaleClosed, "Lottery: must close sale first");            
        require(_hash != bytes32(0), "Lottery: hash cannot be zero");                                  
        require(round.participants.length > 0, "Lottery: no participants");
        require(msg.value > 0, "Lottery: must deposit collateral");                                    

        round.lockedCollateral = msg.value;                                                    
        round.targetBlock = block.number + 10;                                                 

        round.committedHash = _hash;
        round.phase = Phase.Committed;

        emit HashCommitted(currentRound, _hash);
    }

    /**
     * @notice Owner reveals the secret to verify the commitment and deterministically draws a winner.
     * @dev Calculates winner using keccak256(secret, futureBlockHash, totalParticipants). Refunds collateral to the owner.
     * @param _secret The raw secret value originally hashed in `commitHash`. Passes through calldata only.
     */
    function revealAndDraw(bytes32 _secret) external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed, "Lottery: not in committed phase");                
        
        // [GAS OPTIMIZED] Cache targetBlock to memory to avoid multiple SLOADs
        uint256 _targetBlock = round.targetBlock;
        require(block.number > _targetBlock, "Lottery: target block not mined yet");           
        require(block.number <= _targetBlock + 250, "Lottery: blockhash expired");             

        // Verify the secret matches what was committed revert if not
        require(
            keccak256(abi.encodePacked(_secret)) == round.committedHash,
            "Lottery: secret does not match committed hash"
        );

        // Cache storage read (gas optimisation — avoids repeated SLOAD).
        uint256 totalParticipants = round.participants.length;

        // Fetch the future blockhash using the cached variable
        bytes32 futureBlockHash = blockhash(_targetBlock);
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

        // [GAS OPTIMIZED] Store the calculated winner in memory to use in the event below
        address _winner = round.participants[winnerIndex];
        
        round.winner = _winner;
        round.phase  = Phase.Drawn;
        
        // Return collateral to the honest owner
        uint256 collateralToReturn = round.lockedCollateral;
        round.lockedCollateral = 0;
        
        // [GAS OPTIMIZED] Cache the prize pool to memory before emitting event
        uint256 _prizePool = round.prizePool;
        
        (bool success, ) = msg.sender.call{value: collateralToReturn}("");
        require(success, "Lottery: collateral return failed");

        // Use the cached memory variables instead of pulling from storage again
        emit WinnerDrawn(currentRound, _winner, _prizePool);
    }

    /**
     * @notice Slashes the owner's collateral if they fail to reveal the secret in time.
     * @dev Can be called by anyone after the reveal deadline (targetBlock + 250) has passed.
     */
    function slashOwner() external {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed, "Lottery: not in committed phase");
        require(block.number > round.targetBlock + 250, "Lottery: reveal deadline not passed");
        
        round.phase = Phase.Slashed;
        emit OwnerSlashed(currentRound);
    }

    /**
     * @notice Allows the winner of a specific round to withdraw the entire prize pool.
     * @dev Protected by ReentrancyGuard. Follows checks-effects-interactions pattern.
     * @param _roundId The ID of the lottery round to claim the prize for.
     */
    function claimPrize(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.phase == Phase.Drawn, "Lottery: prize not yet available");
        require(msg.sender == round.winner, "Lottery: caller is not the winner");
        require(!round.prizeClaimed, "Lottery: prize already claimed");

        uint256 payout = round.prizePool;
        round.prizePool    = 0;
        round.prizeClaimed = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(_roundId, msg.sender, payout);
    }

    /**
     * @notice Allows participants to claim a refund if the owner was slashed.
     * @dev Calculates proportional refund based on tickets bought and total funds (prize pool + slashed collateral).
     * @param _roundId The ID of the slashed lottery round.
     */
    function claimRefund(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.phase == Phase.Slashed, "Lottery: owner not slashed");          
        
        uint256 tickets = round.userTickets[msg.sender];
        require(tickets > 0, "Lottery: no tickets to refund");

        round.userTickets[msg.sender] = 0;                                            

        uint256 totalFundsAvailable = round.prizePool + round.lockedCollateral;
        uint256 refundAmount = (tickets * totalFundsAvailable) / round.participants.length;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    /**
     * @notice Returns the total number of tickets sold for a specific round.
     * @param _roundId The ID of the round to query.
     * @return The total number of tickets sold.
     */
    function totalTickets(uint256 _roundId) external view returns (uint256) {
        return rounds[_roundId].participants.length;
    }

    /**
     * @notice Returns the ticket holder at a given index (ticket ID) for a specific round.
     * @param _roundId The ID of the round to query.
     * @param index The index of the participant (ticket ID).
     * @return The address of the participant.
     */
    function getParticipant(uint256 _roundId, uint256 index) external view returns (address) {
        require(index < rounds[_roundId].participants.length, "Lottery: index out of bounds");
        return rounds[_roundId].participants[index];
    }
    
    // =============================================================
    // GETTERS 
    // =============================================================

    /**
     * @notice Gets the current phase of a specific round.
     * @param _roundId The ID of the round.
     * @return The Phase enum value.
     */
    function phase(uint256 _roundId) external view returns (Phase) { return rounds[_roundId].phase; }

    /**
     * @notice Gets the committed hash for a specific round.
     * @param _roundId The ID of the round.
     * @return The bytes32 committed hash.
     */
    function committedHash(uint256 _roundId) external view returns (bytes32) { return rounds[_roundId].committedHash; }

    /**
     * @notice Gets the winning address for a specific round.
     * @param _roundId The ID of the round.
     * @return The address of the winner (or zero address if not drawn).
     */
    function winner(uint256 _roundId) external view returns (address) { return rounds[_roundId].winner; }

    /**
     * @notice Gets the total prize pool amount for a specific round.
     * @param _roundId The ID of the round.
     * @return The total amount of wei in the prize pool.
     */
    function prizePool(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].prizePool; }

    /**
     * @notice Gets the target block for the blockhash calculation.
     * @param _roundId The ID of the round.
     * @return The block number designated for the blockhash fetch.
     */
    function targetBlock(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].targetBlock; }

    /**
     * @notice Gets the amount of collateral locked by the owner in a specific round.
     * @param _roundId The ID of the round.
     * @return The amount of locked collateral in wei.
     */
    function lockedCollateral(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].lockedCollateral; }

    /**
     * @notice Checks if the prize for a specific round has been claimed.
     * @param _roundId The ID of the round.
     * @return Boolean indicating whether the prize is claimed.
     */
    function prizeClaimed(uint256 _roundId) external view returns (bool) { return rounds[_roundId].prizeClaimed; }

    /**
     * @notice Gets the number of tickets purchased by a specific user in a specific round.
     * @param _roundId The ID of the round.
     * @param _user The address of the user to query.
     * @return The number of tickets the user owns.
     */
    function userTickets(uint256 _roundId, address _user) external view returns (uint256) { return rounds[_roundId].userTickets[_user]; }
}