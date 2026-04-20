"use client";

import { useState } from "react";
import { Ticket, Trophy, ExternalLink, CheckCircle2, Info } from "lucide-react";
import toast from "react-hot-toast";
import type { ContractState, UseContractReturn } from "@/hooks/useContract";
import type { WalletState } from "@/hooks/useWallet";
import { formatEth, etherscanTx } from "@/lib/utils";
import { TICKET_PRICE_ETH, ZERO_ADDRESS } from "@/lib/constants";

interface UserActionsProps {
  wallet:        WalletState;
  contractState: ContractState | undefined;
  actions:       Pick<UseContractReturn, "buyTicket" | "claimPrize">;
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
  contractState,
  actions,
}: UserActionsProps) {
  const [ethAmount,   setEthAmount]   = useState(TICKET_PRICE_ETH);
  const [isBuying,    setIsBuying]    = useState(false);
  const [isClaiming,  setIsClaiming]  = useState(false);

  const phase    = contractState?.phase;
  const isOpen   = phase === 0;
  const isDrawn  = phase === 3;

  const isWinner =
    wallet.address &&
    contractState?.winner &&
    contractState.winner !== ZERO_ADDRESS &&
    contractState.winner.toLowerCase() === wallet.address.toLowerCase();

  const canBuy =
    wallet.isConnected &&
    wallet.isCorrectNetwork &&
    isOpen &&
    !contractState?.hasTicket;

  const canClaim =
    wallet.isConnected &&
    wallet.isCorrectNetwork &&
    isDrawn &&
    isWinner;

  const handleBuy = async () => {
    const val = parseFloat(ethAmount);
    if (!ethAmount || isNaN(val) || val <= 0) {
      toast.error("Please enter a valid ETH amount.");
      return;
    }
    setIsBuying(true);
    const id = toast.loading("Awaiting wallet confirmation…");
    try {
      const { hash } = await actions.buyTicket(ethAmount);
      toast.success(
        <span>Ticket purchased!<TxLink hash={hash} /></span>,
        { id, duration: 10000 }
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsBuying(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    const id = toast.loading("Claiming prize…");
    try {
      const { hash } = await actions.claimPrize();
      toast.success(
        <span>🎉 Prize claimed!<TxLink hash={hash} /></span>,
        { id, duration: 12000 }
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsClaiming(false);
    }
  };

  const buyDisabledReason = !wallet.isConnected
    ? "Connect your wallet to purchase a ticket."
    : !wallet.isCorrectNetwork
    ? "Switch to the correct network first."
    : contractState?.hasTicket
    ? "You already hold a ticket for this round."
    : !isOpen
    ? "Ticket sales are not open right now."
    : null;

  return (
    <section className="animate-slide-up-d1 rounded-2xl border border-lborder bg-lsurface shadow-lpanel">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-lborder px-3 sm:px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Ticket className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ltext">
            Participate
          </h2>
          <p className="text-[11px] text-ldim">Buy a ticket or claim your winnings</p>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-6">
        {/* Already has ticket */}
        {contractState?.hasTicket && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>You are entered in this round. Good luck!</span>
          </div>
        )}

        {/* Winner banner */}
        {isWinner && (
          <div className="rounded-xl border border-yellow-500/30 bg-l-gradient-gold bg-lgold/5 px-4 py-4 shadow-lgolden">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold">You are the winner!</span>
            </div>
            <p className="mt-1 text-sm text-yellow-400/70">
              Claim your prize of{" "}
              <span className="font-semibold text-yellow-300">
                {contractState ? formatEth(contractState.prizePool) : "—"} ETH
              </span>{" "}
              below.
            </p>
          </div>
        )}

        {/* ── Buy Ticket ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-lborder bg-lcard p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ltext">Buy Ticket</span>
              {contractState && (
                <span className="rounded-md bg-lghost px-2 py-0.5 font-mono text-[11px] text-lsubtle ring-1 ring-lborder">
                  Min {formatEth(contractState.ticketPrice)} ETH
                </span>
              )}
            </div>
            <span
              className={`text-[11px] font-medium ${
                isOpen ? "text-emerald-400" : "text-ldim"
              }`}
            >
              {isOpen ? "● Sales open" : "● Sales closed"}
            </span>
          </div>

          <div className="flex gap-2.5">
            {/* ETH input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-medium text-ldim">
                Ξ
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="0.01"
                disabled={!canBuy || isBuying}
                className="w-full rounded-lg border border-lborder bg-lsurface py-2.5 pl-8 pr-4 font-mono text-sm text-ltext placeholder-ldim outline-none transition-all focus:border-laccent/60 focus:ring-2 focus:ring-laccent/15 disabled:opacity-50"
              />
            </div>
            {/* Buy button */}
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

          {/* Disabled reason */}
          {buyDisabledReason && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ldim">
              <Info className="h-3 w-3 shrink-0" />
              {buyDisabledReason}
            </div>
          )}
        </div>

        {/* ── Claim Prize ────────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-5 transition-all ${
            canClaim
              ? "border-yellow-500/25 bg-l-gradient-gold bg-lcard"
              : "border-lborder bg-lcard opacity-60"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ltext">Claim Prize</span>
            <span className="text-[11px] text-ldim">
              {isDrawn ? "Winner drawn" : "Awaiting draw"}
            </span>
          </div>

          <button
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              canClaim
                ? "bg-yellow-500 text-white shadow-lgolden hover:bg-yellow-400"
                : "border border-lborder text-ldim"
            }`}
          >
            {isClaiming ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trophy className="h-3.5 w-3.5" />
            )}
            {isClaiming ? "Claiming…" : "Claim Prize"}
          </button>

          {!canClaim && (
            <p className="mt-3 text-center text-[11px] text-ldim">
              {!isDrawn
                ? "Available after the winner is drawn."
                : !isWinner
                ? "Only the winning address can claim."
                : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
