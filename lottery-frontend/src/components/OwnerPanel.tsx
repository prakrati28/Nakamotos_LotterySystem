"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Eye, Hash, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import type { ContractState, UseContractReturn } from "@/hooks/useContract";
import type { WalletState } from "@/hooks/useWallet";
import { etherscanTx, buildCommitHash } from "@/lib/utils";

interface OwnerPanelProps {
  wallet: WalletState;
  contractState: ContractState | undefined;
  actions: Pick<
    UseContractReturn,
    "closeSale" | "commitHash" | "revealAndDraw"
  >;
}

export default function OwnerPanel({
  wallet,
  contractState,
  actions,
}: OwnerPanelProps) {
  const [secret, setSecret] = useState("");
  const [revealSecret, setRevealSecret] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [previewHash, setPreviewHash] = useState<string | null>(null);

  // Only render for the contract owner
  const isOwner =
    wallet.address &&
    contractState?.owner &&
    wallet.address.toLowerCase() === contractState.owner.toLowerCase();

  if (!isOwner) return null;

  const phase = contractState?.phase;

  const canClose = phase === 0;
  const canCommit = phase === 1;
  const canReveal = phase === 2;

  const handleCloseSale = async () => {
    setIsClosing(true);
    const id = toast.loading("Closing sale…");
    try {
      const { hash } = await actions.closeSale();
      toast.success(
        () => (
          <span className="flex items-center gap-2">
            Sale closed.{" "}
            <a href={etherscanTx(hash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
              View <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        ),
        { id, duration: 8000 }
      );
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsClosing(false);
    }
  };

  const handleCommit = async () => {
    if (!secret.trim()) {
      toast.error("Enter a secret string to commit.");
      return;
    }
    setIsCommitting(true);
    const id = toast.loading("Committing hash…");
    try {
      const { hash } = await actions.commitHash(secret);
      toast.success(
        () => (
          <span className="flex items-center gap-2">
            Hash committed.{" "}
            <a href={etherscanTx(hash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
              View <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        ),
        { id, duration: 8000 }
      );
      setSecret("");
      setPreviewHash(null);
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReveal = async () => {
    if (!revealSecret.trim()) {
      toast.error("Enter your original secret to reveal.");
      return;
    }
    setIsRevealing(true);
    const id = toast.loading("Revealing secret and drawing winner…");
    try {
      const { hash } = await actions.revealAndDraw(revealSecret);
      toast.success(
        () => (
          <span className="flex items-center gap-2">
            Winner drawn! 🎉{" "}
            <a href={etherscanTx(hash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
              View <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        ),
        { id, duration: 10000 }
      );
      setRevealSecret("");
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsRevealing(false);
    }
  };

  const handleSecretChange = (val: string) => {
    setSecret(val);
    if (val.trim()) {
      try {
        setPreviewHash(buildCommitHash(val));
      } catch {
        setPreviewHash(null);
      }
    } else {
      setPreviewHash(null);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-card p-6 shadow-glow animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <ShieldCheck className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h2 className="font-display text-xl tracking-wider text-text">
            OWNER PANEL
          </h2>
          <p className="text-xs text-muted">Administrative controls</p>
        </div>
        <span className="ml-auto rounded-full bg-accent/10 px-3 py-1 text-xs font-mono font-semibold text-accent">
          OWNER
        </span>
      </div>

      <div className="space-y-4">
        {/* ── Close Sale ──────────────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-5 transition-all ${
            canClose ? "border-border bg-surface" : "border-border/50 bg-surface/50 opacity-60"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-warn" />
            <span className="text-sm font-semibold text-text">Close Sale</span>
            <span className={`ml-auto text-xs font-mono ${canClose ? "text-success" : "text-muted"}`}>
              {canClose ? "Available" : "Phase: Open only"}
            </span>
          </div>
          <p className="mb-4 text-xs text-muted">
            Stop ticket purchases and move to the Committed phase.
          </p>
          <button
            onClick={handleCloseSale}
            disabled={!canClose || isClosing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm font-semibold text-warn transition-all hover:bg-warn/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isClosing ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-warn/40 border-t-warn" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isClosing ? "Closing…" : "Close Sale"}
          </button>
        </div>

        {/* ── Commit Hash ─────────────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-5 transition-all ${
            canCommit ? "border-border bg-surface" : "border-border/50 bg-surface/50 opacity-60"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-semibold text-text">Commit Hash</span>
            <span className={`ml-auto text-xs font-mono ${canCommit ? "text-success" : "text-muted"}`}>
              {canCommit ? "Available" : "Phase: Sale Closed only"}
            </span>
          </div>
          <p className="mb-4 text-xs text-muted">
            Enter a secret string. The keccak256 hash will be committed on-chain.
            Keep your secret safe — you need it for the reveal step.
          </p>

          <input
            type="text"
            value={secret}
            onChange={(e) => handleSecretChange(e.target.value)}
            placeholder="Enter your secret phrase…"
            disabled={!canCommit || isCommitting}
            className="mb-3 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/20 disabled:opacity-40"
          />

          {/* Hash preview */}
          {previewHash && (
            <div className="mb-3 rounded-lg border border-border bg-bg p-3">
              <p className="mb-1 text-xs text-muted">Hash preview (will be submitted):</p>
              <p className="break-all font-mono text-xs text-subtle">{previewHash}</p>
            </div>
          )}

          <button
            onClick={handleCommit}
            disabled={!canCommit || isCommitting || !secret.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-400 transition-all hover:bg-yellow-400/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCommitting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-yellow-400/40 border-t-yellow-400" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
            {isCommitting ? "Committing…" : "Commit Hash"}
          </button>
        </div>

        {/* ── Reveal and Draw ─────────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-5 transition-all ${
            canReveal ? "border-border bg-surface" : "border-border/50 bg-surface/50 opacity-60"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text">Reveal & Draw</span>
            <span className={`ml-auto text-xs font-mono ${canReveal ? "text-success" : "text-muted"}`}>
              {canReveal ? "Available" : "Phase: Committed only"}
            </span>
          </div>
          <p className="mb-4 text-xs text-muted">
            Reveal the original secret used during commit. The contract will
            verify it and draw a winner using commit-reveal randomness.
          </p>

          <input
            type="text"
            value={revealSecret}
            onChange={(e) => setRevealSecret(e.target.value)}
            placeholder="Enter the original secret phrase…"
            disabled={!canReveal || isRevealing}
            className="mb-3 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder-muted outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/20 disabled:opacity-40"
          />

          <button
            onClick={handleReveal}
            disabled={!canReveal || isRevealing || !revealSecret.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-accentDim active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRevealing ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isRevealing ? "Drawing Winner…" : "Reveal & Draw Winner"}
          </button>
        </div>
      </div>
    </div>
  );
}
