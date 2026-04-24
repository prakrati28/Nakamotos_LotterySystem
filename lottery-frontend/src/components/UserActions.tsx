"use client";

import { useState } from "react";
import {
  Ticket,
  Trophy,
  RefreshCw,
  ExternalLink,
  Info,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import type { RoundState, UseContractReturn } from "@/hooks/useContract";
import type { WalletState } from "@/hooks/useWallet";
import { formatEth, etherscanTx } from "@/lib/utils";
import { ZERO_ADDRESS } from "@/lib/constants";

interface UserActionsProps {
  wallet: WalletState;
  roundState: RoundState | undefined;
  actions: Pick<
    UseContractReturn,
    "buyTicket" | "claimPrize" | "claimRefund" | "slashOwner"
  >;
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={etherscanTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
    >
      View tx <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default function UserActions({
  wallet,
  roundState,
  actions,
}: UserActionsProps) {
  const [isBuying, setIsBuying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isSlashing, setIsSlashing] = useState(false);
  const phase = roundState?.phase;
  const roundId = roundState?.roundId;
  const isOpen = phase === "Open";
  const isDrawn = phase === "Drawn";
  const isSlashed = phase === "Slashed";
  const isCommitted = phase === "Committed";

  const isWinner =
    wallet.address &&
    roundState?.winner &&
    roundState.winner !== ZERO_ADDRESS &&
    roundState.winner.toLowerCase() === wallet.address.toLowerCase();

  const hasTicket = (roundState?.userTickets ?? 0) > 0;
  const ticketPrice = roundState?.ticketPrice ?? "0";
  const canBuy = wallet.isConnected && wallet.isCorrectNetwork && isOpen;
  const canClaim =
    wallet.isConnected &&
    wallet.isCorrectNetwork &&
    isDrawn &&
    isWinner &&
    !roundState?.prizeClaimed;
  const canRefund =
    wallet.isConnected && wallet.isCorrectNetwork && isSlashed && hasTicket;
  const canSlash =
    wallet.isConnected &&
    wallet.isCorrectNetwork &&
    isCommitted &&
    roundState?.currentBlock! > roundState?.revealWindowExpiry!;

  const handleBuy = async () => {
    const val = parseFloat(ticketPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Ticket price is not available.");
      return;
    }
    setIsBuying(true);
    const id = toast.loading("Awaiting wallet confirmation…");
    try {
      const { hash } = await actions.buyTicket(ticketPrice);

      toast.success(
        <span>
          Ticket purchased!
          <TxLink hash={hash} />
        </span>,
        { id, duration: 10000 },
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsBuying(false);
    }
  };

  const handleClaim = async () => {
    if (!roundId) return;
    setIsClaiming(true);
    const id = toast.loading("Claiming prize…");
    try {
      const { hash } = await actions.claimPrize(roundId);
      toast.success(
        <span>
          🎉 Prize claimed!
          <TxLink hash={hash} />
        </span>,
        { id, duration: 12000 },
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRefund = async () => {
    if (!roundId) return;
    setIsRefunding(true);
    const id = toast.loading("Claiming refund…");
    try {
      const { hash } = await actions.claimRefund(roundId);
      toast.success(
        <span>
          Refund claimed!
          <TxLink hash={hash} />
        </span>,
        { id, duration: 10000 },
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleSlash = async () => {
    setIsSlashing(true);
    const id = toast.loading("Slashing owner…");
    try {
      const { hash } = await actions.slashOwner();
      toast.success(
        <span>
          Owner slashed! Collateral redistributed.
          <TxLink hash={hash} />
        </span>,
        { id, duration: 12000 },
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsSlashing(false);
    }
  };

  const buyDisabledReason = !wallet.isConnected
    ? "Connect your wallet to buy a ticket."
    : !wallet.isCorrectNetwork
      ? "Switch to the correct network."
      : !isOpen
        ? `Sales are ${phase === "SaleClosed" ? "closed" : "not open yet"}.`
        : null;

  return (
    <section className="animate-slide-up-d1 rounded-2xl border border-lborder bg-lsurface shadow-lpanel">
      <div className="flex items-center gap-3 border-b border-lborder px-3 md:px-6 py-4">
        <div className="md:flex h-9 w-9 items-center hidden justify-center rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/20">
          <Ticket className="h-4.5 w-4.5 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-ltext">
            Participate
          </h2>
          <p className="text-xs text-ldim">
            Buy tickets - claim prizes - claim refunds
          </p>
        </div>
        {hasTicket && roundState && (
          <span className="ml-auto text-nowrap rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
            {roundState.userTickets} ticket
            {roundState.userTickets !== 1 ? "s" : ""} held
          </span>
        )}
      </div>

      <div className="space-y-4 p-2 md:p-6">
        {/* Winner banner */}
        {isWinner && !roundState?.prizeClaimed && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/8 p-2 md:p-4">
            <div className="flex items-center gap-2 text-yellow-300">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold text-base">
                You are the winner!
              </span>
            </div>
            <p className="mt-1.5 text-sm text-yellow-400/80">
              Claim your prize of{" "}
              <span className="font-semibold text-yellow-300">
                {(formatEth(roundState.prizePoolWei) as any) / 1e9} Gwei
              </span>{" "}
              below.
            </p>
          </div>
        )}

        {/* Slashed notice */}
        {isSlashed && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/6 p-2 md:p-4">
            <p className="font-semibold text-red-300">Round was slashed</p>
            <p className="mt-1 text-sm text-red-400/75">
              The owner missed the reveal window. If you hold tickets, you can
              claim a full refund.
            </p>
          </div>
        )}

        {/* Buy Ticket */}
        <div className="rounded-xl border border-lborder bg-lcard p-2.5 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-ltext">
                Buy Ticket
              </span>
              {roundState && (
                <span className="rounded-lg bg-lghost px-2.5 py-1 font-mono text-xs text-lsubtle ring-1 ring-lborder">
                  {(formatEth(roundState.ticketPriceWei) as any) / 1e9} Gwei
                </span>
              )}
            </div>
            <span
              className={`text-xs font-semibold ${isOpen ? "text-emerald-400" : "text-ldim"}`}
            >
              {isOpen ? "Sales open" : "Sales closed"}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex gap-2 px-2 items-center rounded-xl border border-lborder bg-lghost">
              <div className="pointer-events-none font-mono text-sm text-ldim">
                Ξ
              </div>
              <div className="flex w-full font-mono text-sm text-ltext select-none">
                10 Gwei
              </div>
              <div className="pointer-events-none text-[10px] font-bold uppercase tracking-wider text-ldim">
                fixed
              </div>
            </div>
            <button
              onClick={handleBuy}
              disabled={!canBuy || isBuying}
              className="flex items-center justify-center gap-2 rounded-xl bg-laccent px-2.5 md:px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBuying ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Ticket className="h-3.5 w-3.5" />
              )}
              {isBuying ? "Buying…" : "Buy Ticket"}
            </button>
          </div>
          {buyDisabledReason && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ldim">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {buyDisabledReason}
            </div>
          )}
        </div>

        {/* Claim Prize */}
        <div
          className={`rounded-xl border p-2.5 md:p-5 transition-all ${canClaim ? "border-yellow-500/30 bg-yellow-500/6" : "border-lborder bg-lcard opacity-60"}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-base font-semibold text-ltext">
              Claim Prize
            </span>
            <span className="text-xs text-ldim">
              {isDrawn
                ? roundState?.prizeClaimed
                  ? "Already claimed"
                  : "Winner drawn"
                : "Awaiting draw"}
            </span>
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${canClaim ? "bg-yellow-500 text-white hover:bg-yellow-400" : "border border-lborder text-ldim"}`}
          >
            {isClaiming ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trophy className="h-3.5 w-3.5" />
            )}
            {isClaiming ? "Claiming…" : "Claim Prize"}
          </button>
          {!canClaim && isDrawn && !roundState?.prizeClaimed && (
            <p className="mt-3 text-center text-sm text-ldim">
              Only the winning address can claim.
            </p>
          )}
        </div>

        {/* Claim Refund */}
        {(isSlashed || canRefund) && (
          <div
            className={`rounded-xl border p-2.5 md:p-5 transition-all ${canRefund ? "border-red-500/25 bg-red-500/6" : "border-lborder bg-lcard opacity-60"}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-ltext">
                Claim Refund
              </span>
              <span className="text-xs text-ldim">Slashed round</span>
            </div>
            <button
              onClick={handleRefund}
              disabled={!canRefund || isRefunding}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${canRefund ? "bg-red-500 text-white hover:bg-red-400" : "border border-lborder text-ldim"}`}
            >
              {isRefunding ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isRefunding ? "Claiming…" : "Claim Refund"}
            </button>
            {!canRefund && isSlashed && (
              <p className="mt-3 text-center text-sm text-ldim">
                You need to hold tickets in this round.
              </p>
            )}
          </div>
        )}

        {/* Slash Owner */}
        {canSlash && (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/6 p-2.5 md:p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-base font-semibold text-orange-300">
                Owner Missed Reveal Window
              </span>
            </div>
            <p className="mb-4 text-sm text-orange-400/75">
              The owner has not revealed within the 250-block window. Anyone can
              slash them to claim their collateral.
            </p>
            <button
              onClick={handleSlash}
              disabled={isSlashing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-400 active:scale-95 disabled:opacity-50"
            >
              {isSlashing ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {isSlashing ? "Slashing…" : "Slash Owner"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
