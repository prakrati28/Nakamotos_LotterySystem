// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/lottery.sol";

/**
 * @title  LotteryTest
 * @notice Full Foundry test suite for the Lottery contract.
 *
 * Coverage targets (E. Testing — 4 Marks):
 *  [2 marks]
 *   ✓ Ticket purchases revert after sale is closed
 *   ✓ Revealing wrong secret (hash mismatch) reverts
 *   ✓ Only winner can claim the prize
 *   ✓ Prize pool exactly equals sum of all ticket payments
 *   ✓ Second call to revealAndDraw reverts
 *   ✓ Non-winner claimPrize reverts
 *
 *  [1 mark] Revert/failure test for each function
 *   (wrong caller, invalid input, wrong state)
 *
 *  [1 mark] Run `forge coverage` — all lines exercised here
 */
contract LotteryTest is Test {

    // ─────────────────────────────────────────────────
    //  Constants & state
    // ─────────────────────────────────────────────────

    uint256 constant TICKET_PRICE = 0.1 ether;

    Lottery lottery;

    // Named actors
    address owner   = makeAddr("owner");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address carol   = makeAddr("carol");
    address nonWinner = makeAddr("nonWinner");

    // Commit-reveal values used across tests
    bytes32 secret     = keccak256(abi.encodePacked("supersecret42"));
    bytes32 commitment = keccak256(abi.encodePacked(secret));

    // ─────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────

    /// @dev Deploys a fresh lottery and funds test accounts.
    function setUp() public {
        vm.deal(owner,    10 ether);
        vm.deal(alice,    10 ether);
        vm.deal(bob,      10 ether);
        vm.deal(carol,    10 ether);
        vm.deal(nonWinner, 10 ether);

        vm.prank(owner);
        lottery = new Lottery(TICKET_PRICE);
    }

    /// @dev Buys one ticket as `buyer`.
    function _buyTicket(address buyer) internal {
        vm.prank(buyer);
        lottery.buyTicket{value: TICKET_PRICE}();
    }

    /// @dev Full happy-path up to Phase.Committed and mines past targetBlock.
    ///      Returns the targetBlock so callers can further manipulate it.
    function _setupCommitted() internal returns (uint256 tBlock) {
        // 3 participants buy tickets
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(carol);

        // owner closes sale
        vm.prank(owner);
        lottery.closeSale();

        // owner commits hash with collateral
        vm.prank(owner);
        lottery.commitHash{value: 1 ether}(commitment);

        tBlock = lottery.targetBlock();

        // mine past targetBlock so blockhash is available
        vm.roll(tBlock + 1);
    }

    /// @dev Full happy-path up to Phase.Drawn.
    function _setupDrawn() internal {
        _setupCommitted();
        vm.prank(owner);
        lottery.revealAndDraw(secret);
    }

    // ═══════════════════════════════════════════════════════════
    //  1. buyTicket()
    // ═══════════════════════════════════════════════════════════

    /// Happy path: ticket purchase emits event, increments pool
    function test_buyTicket_success() public {
        vm.expectEmit(true, false, false, true);
        emit Lottery.TicketPurchased(alice, 0);

        _buyTicket(alice);

        assertEq(lottery.prizePool(), TICKET_PRICE);
        assertEq(lottery.totalTickets(), 1);
        assertEq(lottery.userTickets(alice), 1);
    }

    /// Multiple purchases accumulate correctly
    function test_buyTicket_multipleParticipants() public {
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(carol);

        assertEq(lottery.totalTickets(), 3);
        assertEq(lottery.prizePool(), 3 * TICKET_PRICE);
    }

    /// [E.2] Ticket purchase reverts after sale is closed
    function test_buyTicket_revert_afterSaleClosed() public {
        _buyTicket(alice);

        vm.prank(owner);
        lottery.closeSale();

        vm.expectRevert("Lottery: sale is closed");
        _buyTicket(bob);
    }

    /// Reverts when wrong ETH value sent
    function test_buyTicket_revert_wrongPrice() public {
        vm.prank(alice);
        vm.expectRevert("Lottery: incorrect ticket price");
        lottery.buyTicket{value: 0.05 ether}();
    }

    /// Reverts when zero ETH sent
    function test_buyTicket_revert_zeroValue() public {
        vm.prank(alice);
        vm.expectRevert("Lottery: incorrect ticket price");
        lottery.buyTicket{value: 0}();
    }

    // ═══════════════════════════════════════════════════════════
    //  2. closeSale()
    // ═══════════════════════════════════════════════════════════

    /// Happy path
    function test_closeSale_success() public {
        _buyTicket(alice);

        vm.expectEmit(false, false, false, false);
        emit Lottery.SaleClosed();

        vm.prank(owner);
        lottery.closeSale();

        assertEq(uint256(lottery.phase()), uint256(Lottery.Phase.SaleClosed));
    }

    /// Reverts if called by non-owner
    function test_closeSale_revert_notOwner() public {
        _buyTicket(alice);

        vm.prank(alice);
        vm.expectRevert();          // OZ Ownable reverts with custom error
        lottery.closeSale();
    }

    /// Reverts if no participants
    function test_closeSale_revert_noParticipants() public {
        vm.prank(owner);
        vm.expectRevert("Lottery: no participants to close sale for");
        lottery.closeSale();
    }

    /// Reverts if already in wrong phase
    function test_closeSale_revert_wrongPhase() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();        // now SaleClosed

        vm.prank(owner);
        vm.expectRevert("Lottery: sale is not open");
        lottery.closeSale();        // should revert
    }

    // ═══════════════════════════════════════════════════════════
    //  3. commitHash()
    // ═══════════════════════════════════════════════════════════

    /// Happy path
    function test_commitHash_success() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();

        vm.expectEmit(true, false, false, false);
        emit Lottery.HashCommitted(commitment);

        vm.prank(owner);
        lottery.commitHash{value: 1 ether}(commitment);

        assertEq(uint256(lottery.phase()), uint256(Lottery.Phase.Committed));
        assertEq(lottery.committedHash(), commitment);
        assertEq(lottery.lockedCollateral(), 1 ether);
    }

    /// Reverts if called by non-owner
    function test_commitHash_revert_notOwner() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();

        vm.prank(alice);
        vm.expectRevert();
        lottery.commitHash{value: 1 ether}(commitment);
    }

    /// Reverts before sale is closed
    function test_commitHash_revert_saleNotClosed() public {
        _buyTicket(alice);

        vm.prank(owner);
        vm.expectRevert("Lottery: must close sale first");
        lottery.commitHash{value: 1 ether}(commitment);
    }

    /// Reverts with zero hash
    function test_commitHash_revert_zeroHash() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();

        vm.prank(owner);
        vm.expectRevert("Lottery: hash cannot be zero");
        lottery.commitHash{value: 1 ether}(bytes32(0));
    }

    /// Reverts with no collateral
    function test_commitHash_revert_noCollateral() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();

        vm.prank(owner);
        vm.expectRevert("Lottery: must deposit collateral");
        lottery.commitHash{value: 0}(commitment);
    }

    // ═══════════════════════════════════════════════════════════
    //  4. revealAndDraw()
    // ═══════════════════════════════════════════════════════════

    /// Happy path: winner is set, phase transitions, event emitted
    function test_revealAndDraw_success() public {
        _setupCommitted();

        vm.prank(owner);
        lottery.revealAndDraw(secret);

        assertEq(uint256(lottery.phase()), uint256(Lottery.Phase.Drawn));
        assertTrue(lottery.winner() != address(0));
    }

    /// [E.2] Revealing wrong secret reverts (hash mismatch)
    function test_revealAndDraw_revert_wrongSecret() public {
        _setupCommitted();

        bytes32 wrongSecret = keccak256(abi.encodePacked("wrongsecret"));

        vm.prank(owner);
        vm.expectRevert("Lottery: secret does not match committed hash");
        lottery.revealAndDraw(wrongSecret);
    }

    /// [E] Second call to revealAndDraw reverts (phase is Drawn, not Committed)
    function test_revealAndDraw_revert_calledTwice() public {
        _setupCommitted();

        vm.prank(owner);
        lottery.revealAndDraw(secret);      // first call succeeds

        vm.prank(owner);
        vm.expectRevert("Lottery: not in committed phase");
        lottery.revealAndDraw(secret);      // second call must revert
    }

    /// Reverts if called before targetBlock is mined
    function test_revealAndDraw_revert_tooEarly() public {
        _buyTicket(alice);
        vm.prank(owner);
        lottery.closeSale();
        vm.prank(owner);
        lottery.commitHash{value: 1 ether}(commitment);
        // do NOT advance blocks

        vm.prank(owner);
        vm.expectRevert("Lottery: target block not mined yet");
        lottery.revealAndDraw(secret);
    }

    /// Reverts if reveal window expired (> targetBlock + 250)
    function test_revealAndDraw_revert_windowExpired() public {
        uint256 tBlock = _setupCommitted();

        vm.roll(tBlock + 251);              // past reveal window

        vm.prank(owner);
        vm.expectRevert("Lottery: blockhash expired");
        lottery.revealAndDraw(secret);
    }

    /// Reverts if called by non-owner
    function test_revealAndDraw_revert_notOwner() public {
        _setupCommitted();

        vm.prank(alice);
        vm.expectRevert();
        lottery.revealAndDraw(secret);
    }

    /// Collateral is returned to owner on successful reveal
    function test_revealAndDraw_collateralReturnedToOwner() public {
        _setupCommitted();

        uint256 ownerBefore = owner.balance;

        vm.prank(owner);
        lottery.revealAndDraw(secret);

        // Owner gets back 1 ether collateral (gas ignored in balance check direction)
        assertGe(owner.balance, ownerBefore);
        assertEq(lottery.lockedCollateral(), 0);
    }

    // ═══════════════════════════════════════════════════════════
    //  5. claimPrize()
    // ═══════════════════════════════════════════════════════════

    /// [E] Only winner can claim prize
    function test_claimPrize_onlyWinnerCanClaim() public {
        _setupDrawn();

        address drawn = lottery.winner();

        uint256 poolBefore = lottery.prizePool();
        uint256 winnerBefore = drawn.balance;

        vm.prank(drawn);
        lottery.claimPrize();

        assertEq(drawn.balance, winnerBefore + poolBefore);
        assertEq(lottery.prizePool(), 0);
    }

    /// [E] Non-winner claimPrize reverts
    function test_claimPrize_revert_nonWinner() public {
        _setupDrawn();

        vm.prank(nonWinner);
        vm.expectRevert("Lottery: caller is not the winner");
        lottery.claimPrize();
    }

    /// Reverts before draw (wrong phase)
    function test_claimPrize_revert_wrongPhase() public {
        _buyTicket(alice);

        vm.prank(alice);
        vm.expectRevert("Lottery: prize not yet available");
        lottery.claimPrize();
    }

    /// Reverts on second claim (double-spend protection)
    function test_claimPrize_revert_alreadyClaimed() public {
        _setupDrawn();

        address drawn = lottery.winner();

        vm.prank(drawn);
        lottery.claimPrize();               // first claim succeeds

        vm.prank(drawn);
        vm.expectRevert("Lottery: prize already claimed");
        lottery.claimPrize();               // second claim must revert
    }

    // ═══════════════════════════════════════════════════════════
    //  6. Prize pool integrity
    // ═══════════════════════════════════════════════════════════

    /// [E] Prize pool exactly equals sum of all ticket payments
    function test_prizePool_exactlySumOfTickets() public {
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(carol);

        assertEq(lottery.prizePool(), 3 * TICKET_PRICE);
    }

    /// Prize pool equals contract balance after purchases
    function test_prizePool_matchesContractBalance() public {
        _buyTicket(alice);
        _buyTicket(bob);

        assertEq(address(lottery).balance, lottery.prizePool());
    }

    // ═══════════════════════════════════════════════════════════
    //  7. slashOwner()
    // ═══════════════════════════════════════════════════════════

    /// Happy path: slash after deadline
    function test_slashOwner_success() public {
        uint256 tBlock = _setupCommitted();

        vm.roll(tBlock + 251);

        vm.expectEmit(false, false, false, false);
        emit Lottery.OwnerSlashed();

        lottery.slashOwner();   // anyone can call

        assertEq(uint256(lottery.phase()), uint256(Lottery.Phase.Slashed));
    }

    /// Reverts if deadline not yet passed
    function test_slashOwner_revert_deadlineNotPassed() public {
        uint256 tBlock = _setupCommitted();
        vm.roll(tBlock + 1);     // still inside window

        vm.expectRevert("Lottery: reveal deadline not passed");
        lottery.slashOwner();
    }

    /// Reverts if not in Committed phase
    function test_slashOwner_revert_wrongPhase() public {
        vm.expectRevert("Lottery: not in committed phase");
        lottery.slashOwner();
    }

    // ═══════════════════════════════════════════════════════════
    //  8. claimRefund()
    // ═══════════════════════════════════════════════════════════

    /// Happy path: proportional refund paid
    function test_claimRefund_success() public {
        uint256 tBlock = _setupCommitted();
        vm.roll(tBlock + 251);
        lottery.slashOwner();

        uint256 totalFunds = lottery.prizePool() + lottery.lockedCollateral();
        uint256 expectedAlice = (1 * totalFunds) / lottery.totalTickets();

        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        lottery.claimRefund();

        assertEq(alice.balance, aliceBefore + expectedAlice);
    }

    /// Reverts if not slashed
    function test_claimRefund_revert_notSlashed() public {
        _buyTicket(alice);

        vm.prank(alice);
        vm.expectRevert("Lottery: owner not slashed");
        lottery.claimRefund();
    }

    /// Reverts on double-claim
    function test_claimRefund_revert_doubleClaim() public {
        uint256 tBlock = _setupCommitted();
        vm.roll(tBlock + 251);
        lottery.slashOwner();

        vm.prank(alice);
        lottery.claimRefund();

        vm.prank(alice);
        vm.expectRevert("Lottery: no tickets to refund");
        lottery.claimRefund();
    }

    /// Reverts if caller has no tickets
    function test_claimRefund_revert_noTickets() public {
        uint256 tBlock = _setupCommitted();
        vm.roll(tBlock + 251);
        lottery.slashOwner();

        vm.prank(nonWinner);
        vm.expectRevert("Lottery: no tickets to refund");
        lottery.claimRefund();
    }

    // ═══════════════════════════════════════════════════════════
    //  9. View helpers
    // ═══════════════════════════════════════════════════════════

    function test_totalTickets() public {
        assertEq(lottery.totalTickets(), 0);
        _buyTicket(alice);
        assertEq(lottery.totalTickets(), 1);
    }

    function test_getParticipant_success() public {
        _buyTicket(alice);
        assertEq(lottery.getParticipant(0), alice);
    }

    function test_getParticipant_revert_outOfBounds() public {
        vm.expectRevert("Lottery: index out of bounds");
        lottery.getParticipant(0);
    }

    // ═══════════════════════════════════════════════════════════
    //  10. Constructor
    // ═══════════════════════════════════════════════════════════

    function test_constructor_setsTicketPrice() public view {
        assertEq(lottery.ticketPrice(), TICKET_PRICE);
    }

    function test_constructor_revert_zeroPriceReverts() public {
        vm.prank(owner);
        vm.expectRevert("Lottery: ticket price must be > 0");
        new Lottery(0);
    }

    function test_constructor_initialPhaseIsOpen() view public {
        assertEq(uint256(lottery.phase()), uint256(Lottery.Phase.Open));
    }
}
