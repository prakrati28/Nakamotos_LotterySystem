// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Lottery} from "../src/lottery.sol";

/**
 * @title  LotteryTest
 * @notice Full test suite for the Commit-Reveal multi-round Lottery contract.
 *
 * Run tests  :  forge test --match-path test/lotterytest.t.sol -vvv
 * Coverage   :  forge coverage --match-path test/lotterytest.t.sol
 */
contract LotteryTest is Test {

    // Shared state

    Lottery public lottery;

    uint256 constant TICKET_PRICE  = 0.01 ether;
    uint256 constant COLLATERAL    = 1 ether;

    // Off-chain secret and its committed hash
    bytes32 constant SECRET        = keccak256(abi.encodePacked("supersecret"));
    bytes32 immutable COMMIT_HASH  = keccak256(abi.encodePacked(SECRET));

    // Named test accounts
    address owner   = address(this);          // test contract == deployer == owner
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address charlie = makeAddr("charlie");
    address nonWinner = makeAddr("nonWinner");

    // Allow this test contract (= owner) to receive collateral returns

    receive() external payable {}

    // Setup

    function setUp() public {
        lottery = new Lottery(TICKET_PRICE);

        // Fund participant accounts
        vm.deal(alice,    10 ether);
        vm.deal(bob,      10 ether);
        vm.deal(charlie,  10 ether);
        vm.deal(nonWinner, 1 ether);
        vm.deal(owner,   100 ether);
    }

    // Internal helpers

    /// Buy one ticket as `buyer`.
    function _buyTicket(address buyer) internal {
        vm.prank(buyer);
        lottery.buyTicket{value: TICKET_PRICE}();
    }

    /// Full lifecycle up to Phase.Committed for the current round.
    function _advanceToCommitted() internal {
        _buyTicket(alice);
        _buyTicket(bob);

        lottery.closeSale();
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);
    }

    /// Full lifecycle up to Phase.Drawn for the current round.
    /// Returns the roundId that was drawn.
    function _advanceToDrawn() internal returns (uint256 roundId) {
        roundId = lottery.currentRound();
        _advanceToCommitted();

        // Mine past targetBlock
        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        lottery.revealAndDraw(SECRET);
    }

    // 1. TICKET PURCHASE TESTS

    // Happy path

    function test_BuyTicket_Success() public {
        vm.prank(alice);
        lottery.buyTicket{value: TICKET_PRICE}();

        assertEq(lottery.totalTickets(1), 1);
        assertEq(lottery.prizePool(1), TICKET_PRICE);
        assertEq(lottery.getParticipant(1, 0), alice);
    }

    function test_BuyTicket_MultipleParticipants() public {
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(charlie);

        assertEq(lottery.totalTickets(1), 3);
        assertEq(lottery.prizePool(1), 3 * TICKET_PRICE);
    }

    function test_BuyTicket_SameAddressMultipleTimes() public {
        _buyTicket(alice);
        _buyTicket(alice);

        assertEq(lottery.totalTickets(1), 2);
        assertEq(lottery.userTickets(1, alice), 2);
    }

    //  REQUIRED: Ticket purchases revert after sale is closed 

    function test_BuyTicket_RevertsAfterSaleClosed() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert("Lottery: sale is closed");
        vm.prank(bob);
        lottery.buyTicket{value: TICKET_PRICE}();
    }

    function test_BuyTicket_RevertsInCommittedPhase() public {
        _advanceToCommitted();

        vm.expectRevert("Lottery: sale is closed");
        vm.prank(charlie);
        lottery.buyTicket{value: TICKET_PRICE}();
    }

    function test_BuyTicket_RevertsInDrawnPhase() public {
        uint256 roundId = _advanceToDrawn();

        vm.expectRevert("Lottery: sale is closed");
        vm.prank(charlie);
        lottery.buyTicket{value: TICKET_PRICE}();

        assertEq(lottery.currentRound(), roundId); // still same round
    }

    //  Wrong value 

    function test_BuyTicket_RevertsOnWrongPrice_TooLow() public {
        vm.expectRevert("Lottery: incorrect ticket price");
        vm.prank(alice);
        lottery.buyTicket{value: TICKET_PRICE - 1}();
    }

    function test_BuyTicket_RevertsOnWrongPrice_TooHigh() public {
        vm.expectRevert("Lottery: incorrect ticket price");
        vm.prank(alice);
        lottery.buyTicket{value: TICKET_PRICE + 1}();
    }

    // 2. CLOSE SALE TESTS

    function test_CloseSale_Success() public {
        _buyTicket(alice);
        lottery.closeSale();

        assertEq(uint8(lottery.phase(1)), uint8(Lottery.Phase.SaleClosed));
    }

    function test_CloseSale_RevertsIfNotOwner() public {
        _buyTicket(alice);

        vm.expectRevert(); // OZ Ownable reverts with custom error
        vm.prank(alice);
        lottery.closeSale();
    }

    function test_CloseSale_RevertsIfNoParticipants() public {
        vm.expectRevert("Lottery: no participants to close sale for");
        lottery.closeSale();
    }

    function test_CloseSale_RevertsIfAlreadyClosed() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert("Lottery: sale is not open");
        lottery.closeSale();
    }

    // 3. COMMIT HASH TESTS

    function test_CommitHash_Success() public {
        _buyTicket(alice);
        lottery.closeSale();
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);

        assertEq(lottery.committedHash(1), COMMIT_HASH);
        assertEq(uint8(lottery.phase(1)), uint8(Lottery.Phase.Committed));
        assertEq(lottery.lockedCollateral(1), COLLATERAL);
    }

    function test_CommitHash_RevertsIfNotOwner() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert();
        vm.prank(alice);
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);
    }

    function test_CommitHash_RevertsIfSaleNotClosed() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: must close sale first");
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);
    }

    function test_CommitHash_RevertsOnZeroHash() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert("Lottery: hash cannot be zero");
        lottery.commitHash{value: COLLATERAL}(bytes32(0));
    }

    function test_CommitHash_RevertsWithNoCollateral() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert("Lottery: must deposit collateral");
        lottery.commitHash{value: 0}(COMMIT_HASH);
    }

    // 4. REVEAL AND DRAW TESTS

    // Happy path 

    function test_RevealAndDraw_Success() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        lottery.revealAndDraw(SECRET);

        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Drawn));
        assertTrue(lottery.winner(roundId) != address(0));
    }

    function test_RevealAndDraw_CollateralReturnedToOwner() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 ownerBalBefore = address(owner).balance;

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        lottery.revealAndDraw(SECRET);

        // Collateral returned (owner also lost gas, but in test env gas costs = 0)
        assertGe(address(owner).balance, ownerBalBefore);
        assertEq(lottery.lockedCollateral(roundId), 0);
    }

    //  REQUIRED: Revealing wrong secret (hash mismatch) reverts 

    function test_RevealAndDraw_RevertsOnWrongSecret() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        vm.expectRevert("Lottery: secret does not match committed hash");
        lottery.revealAndDraw(keccak256(abi.encodePacked("wrongsecret")));
    }

    function test_RevealAndDraw_RevertsOnEmptySecret() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        vm.expectRevert("Lottery: secret does not match committed hash");
        lottery.revealAndDraw(bytes32(0));
    }

    //  REQUIRED: Second call to revealAndDraw reverts 

    function test_RevealAndDraw_RevertsOnSecondCall() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        lottery.revealAndDraw(SECRET);

        // Phase is now Drawn, second reveal must revert
        vm.expectRevert("Lottery: not in committed phase");
        lottery.revealAndDraw(SECRET);
    }

    function test_RevealAndDraw_RevertsIfNotOwner() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 1);

        vm.expectRevert();
        vm.prank(alice);
        lottery.revealAndDraw(SECRET);
    }

    function test_RevealAndDraw_RevertsBeforeTargetBlock() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        // Do NOT mine past the target block
        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target); // exactly at target, not past

        vm.expectRevert("Lottery: target block not mined yet");
        lottery.revealAndDraw(SECRET);
    }

    function test_RevealAndDraw_RevertsAfterBlockhashExpiry() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251); // 250 block window has passed

        vm.expectRevert("Lottery: blockhash expired");
        lottery.revealAndDraw(SECRET);
    }

    function test_RevealAndDraw_RevertsIfNotCommitted() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: not in committed phase");
        lottery.revealAndDraw(SECRET);
    }

    // 5. CLAIM PRIZE TESTS

    //  REQUIRED: Only winner can claim the prize 

    function test_ClaimPrize_WinnerReceivesPrize() public {
        uint256 roundId = _advanceToDrawn();

        address winnerAddr = lottery.winner(roundId);
        uint256 pool       = lottery.prizePool(roundId);
        uint256 balBefore  = winnerAddr.balance;

        vm.prank(winnerAddr);
        lottery.claimPrize(roundId);

        assertEq(winnerAddr.balance, balBefore + pool);
        assertEq(lottery.prizePool(roundId), 0);
        assertTrue(lottery.prizeClaimed(roundId));
    }

    //  REQUIRED: Non-winner claimPrize reverts 

    function test_ClaimPrize_RevertsForNonWinner() public {
        uint256 roundId = _advanceToDrawn();

        address winnerAddr = lottery.winner(roundId);

        // Pick a non-winner to attempt the claim
        address attacker = (winnerAddr == alice) ? bob : alice;

        vm.expectRevert("Lottery: caller is not the winner");
        vm.prank(attacker);
        lottery.claimPrize(roundId);
    }

    function test_ClaimPrize_RevertsOnDoubleClaim() public {
        uint256 roundId = _advanceToDrawn();

        address winnerAddr = lottery.winner(roundId);

        vm.prank(winnerAddr);
        lottery.claimPrize(roundId);

        vm.expectRevert("Lottery: prize already claimed");
        vm.prank(winnerAddr);
        lottery.claimPrize(roundId);
    }

    function test_ClaimPrize_RevertsIfNotDrawnPhase() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        vm.expectRevert("Lottery: prize not yet available");
        vm.prank(alice);
        lottery.claimPrize(roundId);
    }

    // 6. REQUIRED: Prize pool exactly equals sum of all ticket payments

    function test_PrizePool_ExactlyEqualsTicketPayments() public {
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(charlie);
        _buyTicket(alice); // Alice buys a second ticket

        uint256 expectedPool = 4 * TICKET_PRICE;
        assertEq(lottery.prizePool(1), expectedPool);
    }

    function test_PrizePool_SingleTicket() public {
        _buyTicket(alice);
        assertEq(lottery.prizePool(1), TICKET_PRICE);
    }

    function test_PrizePool_FuzzTicketCount(uint8 count) public {
        vm.assume(count > 0 && count <= 20);

        for (uint256 i = 0; i < count; i++) {
            address buyer = makeAddr(string(abi.encodePacked("buyer", i)));
            vm.deal(buyer, TICKET_PRICE);
            vm.prank(buyer);
            lottery.buyTicket{value: TICKET_PRICE}();
        }

        assertEq(lottery.prizePool(1), uint256(count) * TICKET_PRICE);
        assertEq(lottery.totalTickets(1), count);
    }

    // 7. SLASH OWNER TESTS

    function test_SlashOwner_Success() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251); // Past the reveal deadline

        lottery.slashOwner();

        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Slashed));
    }

    function test_SlashOwner_RevertsBeforeDeadline() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 250); // Exactly at deadline, not past

        vm.expectRevert("Lottery: reveal deadline not passed");
        lottery.slashOwner();
    }

    function test_SlashOwner_RevertsIfNotCommitted() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: not in committed phase");
        lottery.slashOwner();
    }

    // 8. CLAIM REFUND TESTS

    function test_ClaimRefund_Success() public {
        uint256 roundId = lottery.currentRound();
        _buyTicket(alice);
        _buyTicket(bob);

        lottery.closeSale();
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251);

        lottery.slashOwner();

        uint256 aliceBalBefore = alice.balance;

        vm.prank(alice);
        lottery.claimRefund(roundId);

        // Alice had 1 ticket out of 2 participants → gets half the total pot
        // Total pot = 2 * TICKET_PRICE + COLLATERAL
        uint256 totalFunds    = 2 * TICKET_PRICE + COLLATERAL;
        uint256 expectedRefund = totalFunds / 2;

        assertEq(alice.balance, aliceBalBefore + expectedRefund);
    }

    function test_ClaimRefund_RevertsIfNotSlashed() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        vm.expectRevert("Lottery: owner not slashed");
        vm.prank(alice);
        lottery.claimRefund(roundId);
    }

    function test_ClaimRefund_RevertsOnDoubleRefund() public {
        uint256 roundId = lottery.currentRound();
        _buyTicket(alice);

        lottery.closeSale();
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251);
        lottery.slashOwner();

        vm.prank(alice);
        lottery.claimRefund(roundId);

        vm.expectRevert("Lottery: no tickets to refund");
        vm.prank(alice);
        lottery.claimRefund(roundId);
    }

    function test_ClaimRefund_RevertsIfNoTickets() public {
        uint256 roundId = lottery.currentRound();
        _buyTicket(alice);

        lottery.closeSale();
        lottery.commitHash{value: COLLATERAL}(COMMIT_HASH);

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251);
        lottery.slashOwner();

        vm.expectRevert("Lottery: no tickets to refund");
        vm.prank(nonWinner); // never bought a ticket
        lottery.claimRefund(roundId);
    }

    // 9. MULTI-ROUND TESTS

    function test_MultiRound_StartNewRoundAfterDrawn() public {
        _advanceToDrawn();

        assertEq(lottery.currentRound(), 1);
        lottery.startNewRound();
        assertEq(lottery.currentRound(), 2);
        assertEq(uint8(lottery.phase(2)), uint8(Lottery.Phase.Open));
    }

    function test_MultiRound_StartNewRoundAfterSlashed() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 251);
        lottery.slashOwner();

        lottery.startNewRound();
        assertEq(lottery.currentRound(), 2);
        assertEq(uint8(lottery.phase(2)), uint8(Lottery.Phase.Open));
    }

    function test_MultiRound_RevertsIfCurrentRoundNotFinished() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: current round not finished");
        lottery.startNewRound();
    }

    function test_MultiRound_RevertsIfRoundOpen() public {
        vm.expectRevert("Lottery: current round not finished");
        lottery.startNewRound();
    }

    function test_MultiRound_StateIsolation() public {
        // _advanceToDrawn() internally buys alice + bob, then draws round 1
        uint256 roundId = _advanceToDrawn();

        // Capture state AFTER draw (prizePool untouched until claimed)
        uint256 round1Pool   = lottery.prizePool(roundId);
        uint256 round1Tickets = lottery.totalTickets(roundId);

        // Round 2
        lottery.startNewRound();
        _buyTicket(charlie);

        // Round 1 state must be completely unchanged
        assertEq(lottery.prizePool(roundId),    round1Pool,    "Round 1 pool tampered");
        assertEq(lottery.totalTickets(roundId), round1Tickets, "Round 1 tickets tampered");
        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Drawn));

        // Round 2 state independent
        assertEq(lottery.totalTickets(2), 1);
        assertEq(lottery.prizePool(2), TICKET_PRICE);
    }

    function test_MultiRound_StartNewRoundNotOwner() public {
        _advanceToDrawn();

        vm.expectRevert();
        vm.prank(alice);
        lottery.startNewRound();
    }

    // 10. VIEW HELPERS

    function test_GetParticipant_RevertsOnOutOfBounds() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: index out of bounds");
        lottery.getParticipant(1, 999);
    }

    function test_TotalTickets_ReturnsZeroForNewRound() public view {
        assertEq(lottery.totalTickets(1), 0);
    }

    function test_GetParticipant_CorrectAddress() public {
        _buyTicket(alice);
        _buyTicket(bob);

        assertEq(lottery.getParticipant(1, 0), alice);
        assertEq(lottery.getParticipant(1, 1), bob);
    }

    // 11. CONSTRUCTOR TESTS

    function test_Constructor_SetsTicketPrice() public view {
        assertEq(lottery.ticketPrice(), TICKET_PRICE);
    }

    function test_Constructor_FirstRoundIsOpen() public view {
        assertEq(uint8(lottery.phase(1)), uint8(Lottery.Phase.Open));
        assertEq(lottery.currentRound(), 1);
    }

    function test_Constructor_RevertsOnZeroTicketPrice() public {
        vm.expectRevert("Lottery: ticket price must be > 0");
        new Lottery(0);
    }
}