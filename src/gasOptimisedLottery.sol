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
     * Requires the current round to be finished (Drawn or Slashed).
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

    function buyTicket() external payable {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open, "Lottery: sale is closed");              // sale must be in open phase
        require(msg.value == ticketPrice, "Lottery: incorrect ticket price");                // ticket price must match

        uint256 ticketId = round.participants.length;                                // effects
        round.participants.push(msg.sender);
        round.prizePool += msg.value;
        round.userTickets[msg.sender]++; // Track individual ticket counts for refunds

        emit TicketPurchased(currentRound, msg.sender, ticketId);
    }

    /**
     * @notice Owner closes ticket sales, advancing phase to SaleClosed.
     * Must be called before commitHash().
     */
    function closeSale() external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Open, "Lottery: sale is not open");
        require(round.participants.length > 0, "Lottery: no participants to close sale for");

        round.phase = Phase.SaleClosed;
        emit SaleClosed(currentRound);
    }

    /*
      @notice Owner submits keccak256(abi.encodePacked(secret)) to lock in
      commit reveal to prevent frontrunning
      @param  hash:  keccak256(abi.encodePacked(secret)) — computed off-chain.
     */

    function commitHash(bytes32 _hash) external payable onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.SaleClosed, "Lottery: must close sale first");            // lottery sale should be closed
        require(_hash != bytes32(0), "Lottery: hash cannot be zero");                                  // hash is non zero to prevent empty commit
        require(round.participants.length > 0, "Lottery: no participants");
        require(msg.value > 0, "Lottery: must deposit collateral");                                    // Enforce penalty stake

        round.lockedCollateral = msg.value;                                                    // Lock the penalty funds
        round.targetBlock = block.number + 10;                                                 // will require the blockhash 10 blocks from now

        round.committedHash = _hash;
        round.phase = Phase.Committed;

        emit HashCommitted(currentRound, _hash);
    }

      //@param  _secret  The raw secret value committed to via commitHash().  Passes through calldata only; never written to storage.
     //  Owner reveals the secret, verifies it against the committed. Hash, draws the winner deterministically.
    function revealAndDraw(bytes32 _secret) external onlyOwner {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed, "Lottery: not in committed phase");                // phase must be in commit
        
        // [GAS OPTIMIZED] Cache targetBlock to memory to avoid multiple SLOADs
        uint256 _targetBlock = round.targetBlock;
        require(block.number > _targetBlock, "Lottery: target block not mined yet");           // Wait for target block
        require(block.number <= _targetBlock + 250, "Lottery: blockhash expired");             // Enforce reveal deadline

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

    function slashOwner() external {
        Round storage round = rounds[currentRound];
        require(round.phase == Phase.Committed, "Lottery: not in committed phase");
        require(block.number > round.targetBlock + 250, "Lottery: reveal deadline not passed");
        
        round.phase = Phase.Slashed;
        emit OwnerSlashed(currentRound);
    }

    /**
     * @notice Winner calls this to withdraw the entire prize pool for a specific round.
     * Protected by ReentrancyGuard (inherits from OZ).
     * Follows checks-effects-interactions pattern.
     */
    function claimPrize(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        // Access control — only the drawn winner may claim
        require(round.phase == Phase.Drawn, "Lottery: prize not yet available");
        require(msg.sender == round.winner, "Lottery: caller is not the winner");
        require(!round.prizeClaimed, "Lottery: prize already claimed");

        // Effects before interaction (CEI pattern)
        uint256 payout = round.prizePool;
        round.prizePool    = 0;
        round.prizeClaimed = true;

        // Interaction — send ETH last
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(_roundId, msg.sender, payout);
    }

    function claimRefund(uint256 _roundId) external nonReentrant {
        Round storage round = rounds[_roundId];
        require(round.phase == Phase.Slashed, "Lottery: owner not slashed");          // lottery must be in slashed phase to get a refund
        
        uint256 tickets = round.userTickets[msg.sender];
        require(tickets > 0, "Lottery: no tickets to refund");

        round.userTickets[msg.sender] = 0;                                            // Prevent re-claiming

        // Proportional refund: Ticket Cost + Cut of Owner's Collateral
        uint256 totalFundsAvailable = round.prizePool + round.lockedCollateral;
        uint256 refundAmount = (tickets * totalFundsAvailable) / round.participants.length;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(_roundId, msg.sender, refundAmount);
    }

    // View helpers

    /// @notice Returns the total number of tickets sold for a specific round.
    function totalTickets(uint256 _roundId) external view returns (uint256) {
        return rounds[_roundId].participants.length;
    }

    /// @notice Returns the ticket holder at a given index (ticket ID) for a specific round.
    function getParticipant(uint256 _roundId, uint256 index) external view returns (address) {
        require(index < rounds[_roundId].participants.length, "Lottery: index out of bounds");
        return rounds[_roundId].participants[index];
    }
    

    // GETTERS 
    function phase(uint256 _roundId) external view returns (Phase) { return rounds[_roundId].phase; }
    function committedHash(uint256 _roundId) external view returns (bytes32) { return rounds[_roundId].committedHash; }
    function winner(uint256 _roundId) external view returns (address) { return rounds[_roundId].winner; }
    function prizePool(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].prizePool; }
    function targetBlock(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].targetBlock; }
    function lockedCollateral(uint256 _roundId) external view returns (uint256) { return rounds[_roundId].lockedCollateral; }
    function prizeClaimed(uint256 _roundId) external view returns (bool) { return rounds[_roundId].prizeClaimed; }
    function userTickets(uint256 _roundId, address _user) external view returns (uint256) { return rounds[_roundId].userTickets[_user]; }
}