// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  Commit Reveal Lottery
 * On-chain (required for contract logic):
 * - Ticket IDs and participant wallet addresses
 * - Phase enum
 * - Committed hash (bytes32 keccak256 of the secret)
 * - Winner address, prize pool amount
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
    
    Phase   public  phase;
    uint256 public  ticketPrice;

    address[] private participants;                                     // index = ticket ID

    bytes32 public  committedHash;                                      // keccak256(abi.encodePacked(secret))
    address public  winner;
    uint256 public  prizePool;      
    
    uint256 public targetBlock;
    uint256 public lockedCollateral;
    mapping(address => uint256) public userTickets;                     // Needed to track refund amounts
    bool private prizeClaimed;                                          // guard against double claim                      
    
    event TicketPurchased(address indexed buyer, uint256 ticketId);
    event SaleClosed();
    event HashCommitted(bytes32 indexed hash);
    event WinnerDrawn(address indexed winner, uint256 prizeAmount);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event OwnerSlashed();
    event RefundClaimed(address indexed participant, uint256 amount);

    constructor(uint256 _ticketPrice) Ownable(msg.sender) {
        require(_ticketPrice > 0, "Lottery: ticket price must be > 0");
        ticketPrice = _ticketPrice;
        phase = Phase.Open;
    }


    function buyTicket() external payable {
        require(phase == Phase.Open, "Lottery: sale is closed");              //sale must be in open phase
        require(msg.value == ticketPrice, "Lottery: incorrect ticket price"); //ticket price must match

        uint256 ticketId = participants.length;                               //effects
        participants.push(msg.sender);
        prizePool += msg.value;
        userTickets[msg.sender]++; // Track individual ticket counts for refunds

        emit TicketPurchased(msg.sender, ticketId);
    }

     /**
     * @notice Owner closes ticket sales, advancing phase to SaleClosed.
     *         Must be called before commitHash().
     */
    function closeSale() external onlyOwner {
        require(phase == Phase.Open, "Lottery: sale is not open");
        require(participants.length > 0, "Lottery: no participants to close sale for");

        phase = Phase.SaleClosed;
        emit SaleClosed();
    }

    /*
      @notice Owner submits keccak256(abi.encodePacked(secret)) to lock in
      commit reveal to prevent frontrunning
      @param  hash:  keccak256(abi.encodePacked(secret)) — computed off-chain.
     */

//only owner can commit

    function commitHash(bytes32 _hash) external payable onlyOwner {
    
        require(phase == Phase.SaleClosed, "Lottery: must close sale first");           //--lottery sale should be closed
        require(_hash != bytes32(0), "Lottery: hash cannot be zero");                   //-- hash is non zero to prevent empty commit
        require(participants.length > 0, "Lottery: no participants");
        require(msg.value > 0, "Lottery: must deposit collateral");                     // Enforce penalty stake

        lockedCollateral = msg.value;                                                   //  Lock the penalty funds
        targetBlock = block.number + 10;                                                // will require the blockhash 10 blocks from now

        committedHash = _hash;
        phase = Phase.Committed;

        emit HashCommitted(_hash);
    }


   

      //@param  _secret  The raw secret value committed to via commitHash().   Passes through calldata only; never written to storage.
      //  Owner reveals the secret, verifies it against the committed. Hash, draws the winner deterministically.
    
    function revealAndDraw(bytes32 _secret) external onlyOwner {
        require(phase == Phase.Committed, "Lottery: not in committed phase");               //phase must be in commit
        require(block.number > targetBlock, "Lottery: target block not mined yet");         //  Wait for target block
        require(block.number <= targetBlock + 250, "Lottery: blockhash expired");           //  Enforce reveal deadline

        // Verify the secret matches what was committed revert if not
        require(
            keccak256(abi.encodePacked(_secret)) == committedHash,
            "Lottery: secret does not match committed hash"
        );

    
        // Cache storage read (gas optimisation — avoids repeated SLOAD).
        uint256 totalParticipants = participants.length;

        //  Fetch the future blockhash
        bytes32 futureBlockHash = blockhash(targetBlock);
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


        winner = participants[winnerIndex];
        phase  = Phase.Drawn;
        
        // Return collateral to the honest owner
        uint256 collateralToReturn = lockedCollateral;
        lockedCollateral = 0;
        (bool success, ) = msg.sender.call{value: collateralToReturn}("");
        require(success, "Lottery: collateral return failed");

        emit WinnerDrawn(winner, prizePool);
    }

    function slashOwner() external {
        require(phase == Phase.Committed, "Lottery: not in committed phase");
        require(block.number > targetBlock + 250, "Lottery: reveal deadline not passed");
        
        phase = Phase.Slashed;
        emit OwnerSlashed();
    }

    function claimRefund() external nonReentrant {
        require(phase == Phase.Slashed, "Lottery: owner not slashed");          //lottery must be in slashed phase to get a refund
        
        uint256 tickets = userTickets[msg.sender];
        require(tickets > 0, "Lottery: no tickets to refund");

        userTickets[msg.sender] = 0;                                            // Prevent re-claiming

        // Proportional refund: Ticket Cost + Cut of Owner's Collateral
        uint256 totalFundsAvailable = prizePool + lockedCollateral;
        uint256 refundAmount = (tickets * totalFundsAvailable) / participants.length;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Lottery: refund transfer failed");

        emit RefundClaimed(msg.sender, refundAmount);
    }

   

    /**
     * @notice Winner calls this to withdraw the entire prize pool.
     *         Protected by ReentrancyGuard (inherits from OZ).
     *         Follows checks-effects-interactions pattern.
     */
    function claimPrize() external nonReentrant {
        // Access control — only the drawn winner may claim
        require(phase == Phase.Drawn, "Lottery: prize not yet available");
        require(msg.sender == winner, "Lottery: caller is not the winner");
        require(!prizeClaimed, "Lottery: prize already claimed");

        // Effects before interaction (CEI pattern)
        uint256 payout = prizePool;
        prizePool    = 0;
        prizeClaimed = true;

        // Interaction — send ETH last
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Lottery: prize transfer failed");

        emit PrizeClaimed(msg.sender, payout);
    }

    //  View helpers

    /// @notice Returns the total number of tickets sold.
    function totalTickets() external view returns (uint256) {
        return participants.length;
    }

    /// @notice Returns the ticket holder at a given index (ticket ID).
    function getParticipant(uint256 index) external view returns (address) {
        require(index < participants.length, "Lottery: index out of bounds");
        return participants[index];
    }


}