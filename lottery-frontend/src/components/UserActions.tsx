"use client";

import { useState } from "react";
import {
  Ticket,
  Trophy,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
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
  const [ethAmount, setEthAmount] = useState("");
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
    const val = parseFloat(ethAmount || ticketPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a valid ETH amount.");
      return;
    }
    setIsBuying(true);
    const id = toast.loading("Awaiting wallet confirmation…");
    try {
      const { hash } = await actions.buyTicket(ethAmount || ticketPrice);
      toast.success(
        <span>
          Ticket purchased!
          <TxLink hash={hash} />
        </span>,
        { id, duration: 10000 },
      );
      setEthAmount("");
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
      <div className="flex items-center gap-3 border-b border-lborder px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Ticket className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ltext">
            Participate
          </h2>
          <p className="text-[11px] text-ldim">
            Buy tickets · claim prizes · claim refunds
          </p>
        </div>
        {hasTicket && roundState && (
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            {roundState.userTickets} ticket
            {roundState.userTickets !== 1 ? "s" : ""} held
          </span>
        )}
      </div>

      <div className="space-y-4 p-6">
        {/* Winner banner */}
        {isWinner && !roundState?.prizeClaimed && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold">You are the winner!</span>
            </div>
            <p className="mt-1 text-xs text-yellow-400/70">
              Claim your prize of{" "}
              <span className="font-semibold text-yellow-300">
                {formatEth(roundState!.prizePool)} ETH
              </span>{" "}
              below.
            </p>
          </div>
        )}

        {/* Slashed — refund available */}
        {isSlashed && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-sm text-red-400">
            <p className="font-semibold">Round was slashed</p>
            <p className="mt-0.5 text-xs text-red-400/70">
              The owner missed the reveal window. If you hold tickets, you can
              claim a full refund.
            </p>
          </div>
        )}

        {/* ── Buy Ticket ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-lborder bg-lcard p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ltext">
                Buy Ticket
              </span>
              {roundState && (
                <span className="rounded-md bg-lghost px-2 py-0.5 font-mono text-[11px] text-lsubtle ring-1 ring-lborder">
                  {formatEth(roundState.ticketPrice)} ETH
                </span>
              )}
            </div>
            <span
              className={`text-[11px] font-medium ${isOpen ? "text-emerald-400" : "text-ldim"}`}
            >
              {isOpen ? "● Sales open" : "● Sales closed"}
            </span>
          </div>
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ldim">
                Ξ
              </div>
              <div className="w-full rounded-lg border border-lborder bg-lsurface py-2.5 pl-8 pr-4 font-mono text-sm text-ltext placeholder-ldim outline-none transition-all focus:border-laccent/60 focus:ring-2 focus:ring-laccent/15 disabled:opacity-50">
                {ticketPrice}
              </div>
            </div>
            <button
              onClick={handleBuy}
              disabled={!canBuy || isBuying}
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-laccent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ldim">
              <Info className="h-3 w-3 shrink-0" />
              {buyDisabledReason}
            </div>
          )}
        </div>

        {/* ── Claim Prize ──────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-5 transition-all ${canClaim ? "border-yellow-500/25 bg-yellow-500/5" : "border-lborder bg-lcard opacity-60"}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ltext">
              Claim Prize
            </span>
            <span className="text-[11px] text-ldim">
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
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${canClaim ? "bg-yellow-500 text-white hover:bg-yellow-400" : "border border-lborder text-ldim"}`}
          >
            {isClaiming ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trophy className="h-3.5 w-3.5" />
            )}
            {isClaiming ? "Claiming…" : "Claim Prize"}
          </button>
          {!canClaim && isDrawn && !roundState?.prizeClaimed && (
            <p className="mt-3 text-center text-[11px] text-ldim">
              Only the winning address can claim.
            </p>
          )}
        </div>

        {/* ── Claim Refund (Slashed phase) ─────────────────────────── */}
        {(isSlashed || canRefund) && (
          <div
            className={`rounded-xl border p-5 transition-all ${canRefund ? "border-red-500/25 bg-red-500/5" : "border-lborder bg-lcard opacity-60"}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-ltext">
                Claim Refund
              </span>
              <span className="text-[11px] text-ldim">Slashed round</span>
            </div>
            <button
              onClick={handleRefund}
              disabled={!canRefund || isRefunding}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${canRefund ? "bg-red-500 text-white hover:bg-red-400" : "border border-lborder text-ldim"}`}
            >
              {isRefunding ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isRefunding ? "Claiming…" : "Claim Refund"}
            </button>
            {!canRefund && isSlashed && (
              <p className="mt-3 text-center text-[11px] text-ldim">
                You need to hold tickets in this round to claim a refund.
              </p>
            )}
          </div>
        )}

        {/* ── Slash Owner ──────────────────────────────────────────── */}
        {canSlash && (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">
                Owner Missed Reveal Window
              </span>
            </div>
            <p className="mb-4 text-xs text-orange-400/70">
              The owner has not revealed within the 250-block window. Anyone can
              slash them to claim their collateral.
            </p>
            <button
              onClick={handleSlash}
              disabled={isSlashing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-400 active:scale-95 disabled:opacity-50"
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
