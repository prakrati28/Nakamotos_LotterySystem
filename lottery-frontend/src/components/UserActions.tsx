"use client";

import { useState } from "react";
import { Ticket, Gift, ExternalLink, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { ContractState, UseContractReturn } from "@/hooks/useContract";
import type { WalletState } from "@/hooks/useWallet";
import { formatEth, etherscanTx } from "@/lib/utils";
import { TICKET_PRICE_ETH } from "@/lib/constants";

interface UserActionsProps {
  wallet: WalletState;
  contractState: ContractState | undefined;
  actions: Pick<UseContractReturn, "buyTicket" | "claimPrize">;
}

export default function UserActions({
  wallet,
  contractState,
  actions,
}: UserActionsProps) {
  const [ethAmount, setEthAmount] = useState(TICKET_PRICE_ETH);
  const [isBuying, setIsBuying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const phase = contractState?.phase;
  const isOpen = phase === 0;
  const isDrawn = phase === 3;
  const isWinner =
    wallet.address &&
    contractState?.winner?.toLowerCase() === wallet.address.toLowerCase();

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
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast.error("Enter a valid ETH amount.");
      return;
    }
    setIsBuying(true);
    const toastId = toast.loading("Sending transaction…");
    try {
      const { hash } = await actions.buyTicket(ethAmount);
      toast.success(
        () => (
          <span className="flex items-center gap-2">
            Ticket purchased!{" "}
            <a
              href={etherscanTx(hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 underline"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        ),
        { id: toastId, duration: 8000 }
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setIsBuying(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    const toastId = toast.loading("Claiming prize…");
    try {
      const { hash } = await actions.claimPrize();
      toast.success(
        () => (
          <span className="flex items-center gap-2">
            🎉 Prize claimed!{" "}
            <a
              href={etherscanTx(hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 underline"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        ),
        { id: toastId, duration: 10000 }
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-slide-up">
      <div className="mb-6">
        <h2 className="font-display text-xl tracking-wider text-text">
          YOUR ACTIONS
        </h2>
        <p className="mt-0.5 text-sm text-muted">Participate in the lottery</p>
      </div>

      {/* Has ticket badge */}
      {contractState?.hasTicket && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          You already hold a ticket for this round.
        </div>
      )}

      {/* Winner banner */}
      {isWinner && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent shadow-glow">
          <Gift className="h-4 w-4" />
          🎉 Congratulations! You are the winner!
        </div>
      )}

      <div className="space-y-4">
        {/* Buy Ticket */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text">Buy Ticket</span>
            {contractState && (
              <span className="ml-auto text-xs text-muted font-mono">
                Min: {formatEth(contractState.ticketPrice)} ETH
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted">
                Ξ
              </span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg pl-7 pr-4 py-2.5 text-sm font-mono text-text placeholder-muted outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/20 disabled:opacity-40"
                placeholder="0.01"
                disabled={!canBuy || isBuying}
              />
            </div>
            <button
              onClick={handleBuy}
              disabled={!canBuy || isBuying}
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-accentDim active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBuying ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              {isBuying ? "Buying…" : "Buy Ticket"}
            </button>
          </div>

          {/* Reason why disabled */}
          {!canBuy && wallet.isConnected && (
            <p className="mt-2 text-xs text-muted">
              {!wallet.isCorrectNetwork
                ? "Switch to the correct network to buy."
                : contractState?.hasTicket
                ? "You already have a ticket."
                : !isOpen
                ? `Ticket sales are closed (Phase: ${
                    phase !== undefined ? (["Open","Sale Closed","Committed","Drawn"][phase] ?? phase) : "—"
                  }).`
                : ""}
            </p>
          )}
          {!wallet.isConnected && (
            <p className="mt-2 text-xs text-muted">Connect your wallet to buy a ticket.</p>
          )}
        </div>

        {/* Claim Prize */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text">Claim Prize</span>
            {contractState && contractState.winner !== "0x0000000000000000000000000000000000000000" && (
              <span className="ml-auto text-xs text-muted font-mono">
                Pool: {formatEth(contractState.prizePool)} ETH
              </span>
            )}
          </div>

          <button
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isClaiming ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            {isClaiming ? "Claiming…" : "Claim Prize"}
          </button>

          {!canClaim && wallet.isConnected && (
            <p className="mt-2 text-xs text-muted text-center">
              {!isDrawn
                ? "Prize can only be claimed after a winner is drawn."
                : !isWinner
                ? "Only the winner can claim the prize."
                : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
