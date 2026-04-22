// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Lottery} from "../vrf/LotteryVRFChainlink.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

/**
 * @title  LotteryTest
 * @notice Full test suite for the VRF-based multi-round Lottery contract.
 *
 * Run tests  :  FOUNDRY_PROFILE=vrf forge test --match-path vrf/vrfchainlinkTest.t.sol -vvv
 * Coverage   :  FOUNDRY_PROFILE=vrf forge coverage --match-path test/lotterytest.t.sol
 */
contract LotteryTest is Test {

    // Shared state

    Lottery                  public lottery;
    VRFCoordinatorV2_5Mock   public vrfCoordinator;

    uint256 constant TICKET_PRICE = 0.01 ether;

    // VRF config
    bytes32 constant KEY_HASH        = keccak256("keyhash");
    uint96  constant BASE_FEE        = 0.1 ether;   // mock constructor args
    uint96  constant GAS_PRICE_LINK  = 1e9;
    int256  constant WEI_PER_UNIT_LINK = 4e15;

    uint256 public subscriptionId;

    // Named test accounts
    address owner     = address(this);
    address alice     = makeAddr("alice");
    address bob       = makeAddr("bob");
    address charlie   = makeAddr("charlie");
    address nonWinner = makeAddr("nonWinner");

    receive() external payable {}

    // Setup

    function setUp() public {
        // 1. Deploy mock VRF coordinator
        vrfCoordinator = new VRFCoordinatorV2_5Mock(BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK);

        // 2. Create and fund a subscription
        subscriptionId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subscriptionId, 100 ether);

        // 3. Deploy lottery
        lottery = new Lottery(TICKET_PRICE, address(vrfCoordinator), subscriptionId, KEY_HASH);

        // 4. Add lottery as a consumer on the subscription
        vrfCoordinator.addConsumer(subscriptionId, address(lottery));

        // Fund participants
        vm.deal(alice,     10 ether);
        vm.deal(bob,       10 ether);
        vm.deal(charlie,   10 ether);
        vm.deal(nonWinner,  1 ether);
        vm.deal(owner,    100 ether);
    }

    // Internal helpers

    function _buyTicket(address buyer) internal {
        vm.prank(buyer);
        lottery.buyTicket{value: TICKET_PRICE}();
    }

    /// Advance to Phase.Committed (VRF request sent, not yet fulfilled).
    function _advanceToCommitted() internal {
        _buyTicket(alice);
        _buyTicket(bob);
        lottery.closeSale();
        lottery.requestDraw();
    }

    /// Advance to Phase.Drawn by also fulfilling the VRF request.
    /// Returns the roundId that was drawn.
    function _advanceToDrawn() internal returns (uint256 roundId) {
        roundId = lottery.currentRound();
        _advanceToCommitted();
        _fulfillVRF(roundId);
    }

    /// Ask the mock coordinator to fulfil the pending VRF request for a round.
    function _fulfillVRF(uint256 roundId) internal {
        uint256 requestId = lottery.roundVrfRequest(roundId);
        vrfCoordinator.fulfillRandomWords(requestId, address(lottery));
    }

    // 1. TICKET PURCHASE TESTS

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

        assertEq(lottery.currentRound(), roundId);
    }

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

        vm.expectRevert();
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

    // 3. REQUEST DRAW TESTS  (replaces commit hash tests)

    function test_RequestDraw_Success() public {
        _buyTicket(alice);
        lottery.closeSale();
        lottery.requestDraw();

        assertEq(uint8(lottery.phase(1)), uint8(Lottery.Phase.Committed));
        assertGt(lottery.roundVrfRequest(1), 0);
    }

    function test_RequestDraw_RevertsIfNotOwner() public {
        _buyTicket(alice);
        lottery.closeSale();

        vm.expectRevert();
        vm.prank(alice);
        lottery.requestDraw();
    }

    function test_RequestDraw_RevertsIfSaleNotClosed() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: must close sale first");
        lottery.requestDraw();
    }

    function test_RequestDraw_RevertsIfNotCommitted() public {
        // Calling again after already committed should revert
        _advanceToCommitted();

        vm.expectRevert("Lottery: must close sale first");
        lottery.requestDraw();
    }

    // 4. VRF FULFILL (replaces revealAndDraw tests)

    function test_FulfillVRF_DrawsWinner() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();
        _fulfillVRF(roundId);

        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Drawn));
        assertTrue(lottery.winner(roundId) != address(0));
    }

    function test_FulfillVRF_WinnerIsParticipant() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();
        _fulfillVRF(roundId);

        address w = lottery.winner(roundId);
        assertTrue(w == alice || w == bob, "winner must be a participant");
    }

    function test_FulfillVRF_RevertsOnReplay() public {
    uint256 roundId = lottery.currentRound();
    _advanceToCommitted();

    uint256 requestId = lottery.roundVrfRequest(roundId);
    vrfCoordinator.fulfillRandomWords(requestId, address(lottery));

    // The mock coordinator rejects already-fulfilled requestIds with InvalidRequest()
    vm.expectRevert(VRFCoordinatorV2_5Mock.InvalidRequest.selector);
    vrfCoordinator.fulfillRandomWords(requestId, address(lottery));
    }

    // 5. CLAIM PRIZE TESTS

    function test_ClaimPrize_WinnerReceivesPrize() public {
        uint256 roundId   = _advanceToDrawn();
        address winnerAddr = lottery.winner(roundId);
        uint256 pool       = lottery.prizePool(roundId);
        uint256 balBefore  = winnerAddr.balance;

        vm.prank(winnerAddr);
        lottery.claimPrize(roundId);

        assertEq(winnerAddr.balance, balBefore + pool);
        assertEq(lottery.prizePool(roundId), 0);
        assertTrue(lottery.prizeClaimed(roundId));
    }

    function test_ClaimPrize_RevertsForNonWinner() public {
        uint256 roundId    = _advanceToDrawn();
        address winnerAddr = lottery.winner(roundId);
        address attacker   = (winnerAddr == alice) ? bob : alice;

        vm.expectRevert("Lottery: caller is not the winner");
        vm.prank(attacker);
        lottery.claimPrize(roundId);
    }

    function test_ClaimPrize_RevertsOnDoubleClaim() public {
        uint256 roundId    = _advanceToDrawn();
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

    // 6. PRIZE POOL ACCOUNTING

    function test_PrizePool_ExactlyEqualsTicketPayments() public {
        _buyTicket(alice);
        _buyTicket(bob);
        _buyTicket(charlie);
        _buyTicket(alice);

        assertEq(lottery.prizePool(1), 4 * TICKET_PRICE);
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
        vm.roll(target + 257);

        lottery.slashOwner();

        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Slashed));
    }

    function test_SlashOwner_RevertsBeforeDeadline() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 256); // exactly at deadline, not past

        vm.expectRevert("Lottery: reveal deadline not passed");
        lottery.slashOwner();
    }

    function test_SlashOwner_RevertsIfNotCommitted() public {
        _buyTicket(alice);

        vm.expectRevert("Lottery: not in committed phase");
        lottery.slashOwner();
    }

    // 8. CLAIM REFUND TESTS

    function _advanceToSlashed() internal returns (uint256 roundId) {
        roundId = lottery.currentRound();
        _buyTicket(alice);
        _buyTicket(bob);
        lottery.closeSale();
        lottery.requestDraw();

        uint256 target = lottery.targetBlock(roundId);
        vm.roll(target + 257);
        lottery.slashOwner();
    }

    function test_ClaimRefund_Success() public {
        uint256 roundId = _advanceToSlashed();

        uint256 aliceBalBefore = alice.balance;

        vm.prank(alice);
        lottery.claimRefund(roundId);

        // Alice has 1 ticket out of 2 → half the prize pool (no collateral in VRF model)
        // Simpler: prize pool was 2*TICKET_PRICE, alice gets half = TICKET_PRICE
        assertEq(alice.balance, aliceBalBefore + TICKET_PRICE);
    }

    function test_ClaimRefund_RevertsIfNotSlashed() public {
        uint256 roundId = lottery.currentRound();
        _advanceToCommitted();

        vm.expectRevert("Lottery: owner not slashed");
        vm.prank(alice);
        lottery.claimRefund(roundId);
    }

    function test_ClaimRefund_RevertsOnDoubleRefund() public {
        uint256 roundId = _advanceToSlashed();

        vm.prank(alice);
        lottery.claimRefund(roundId);

        vm.expectRevert("Lottery: no tickets to refund");
        vm.prank(alice);
        lottery.claimRefund(roundId);
    }

    function test_ClaimRefund_RevertsIfNoTickets() public {
        uint256 roundId = _advanceToSlashed();

        vm.expectRevert("Lottery: no tickets to refund");
        vm.prank(nonWinner);
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
        _advanceToSlashed();

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
        uint256 roundId = _advanceToDrawn();

        uint256 round1Pool    = lottery.prizePool(roundId);
        uint256 round1Tickets = lottery.totalTickets(roundId);

        lottery.startNewRound();
        _buyTicket(charlie);

        assertEq(lottery.prizePool(roundId),    round1Pool,    "Round 1 pool tampered");
        assertEq(lottery.totalTickets(roundId), round1Tickets, "Round 1 tickets tampered");
        assertEq(uint8(lottery.phase(roundId)), uint8(Lottery.Phase.Drawn));

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
        new Lottery(0, address(vrfCoordinator), subscriptionId, KEY_HASH);
    }
}