"use client";

import { useState } from "react";
import {
  ShieldCheck, Lock, Hash, Eye, ExternalLink,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ContractState, UseContractReturn } from "@/hooks/useContract";
import type { WalletState } from "@/hooks/useWallet";
import { etherscanTx, buildCommitHash } from "@/lib/utils";

interface OwnerPanelProps {
  wallet:        WalletState;
  contractState: ContractState | undefined;
  actions:       Pick<UseContractReturn, "closeSale" | "commitHash" | "revealAndDraw">;
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

function ActionRow({
  icon,
  title,
  subtitle,
  available,
  children,
}: {
  icon:      React.ReactNode;
  title:     string;
  subtitle:  string;
  available: boolean;
  children:  React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${available ? "border-lborder" : "border-lborder/40 opacity-50"}`}>
      {/* Row header */}
      <button
        onClick={() => available && setOpen((o) => !o)}
        disabled={!available}
        className="flex w-full items-center justify-between p-4 text-left disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${available ? "bg-laccent/10" : "bg-lghost"}`}>
            <span className={available ? "text-laccent" : "text-ldim"}>{icon}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-ltext">{title}</div>
            <div className="text-[11px] text-ldim">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${available ? "text-emerald-400" : "text-ldim"}`}>
            {available ? "Available" : "Locked"}
          </span>
          {available && (open ? <ChevronUp className="h-4 w-4 text-ldim" /> : <ChevronDown className="h-4 w-4 text-ldim" />)}
        </div>
      </button>

      {/* Expandable body */}
      {open && available && (
        <div className="border-t border-lborder bg-lbg/50 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function OwnerPanel({ wallet, contractState, actions }: OwnerPanelProps) {
  /* Only visible to contract owner */
  const isOwner =
    wallet.address &&
    contractState?.owner &&
    wallet.address.toLowerCase() === contractState.owner.toLowerCase();

  const [commitSecret,  setCommitSecret]  = useState("");
  const [revealSecret,  setRevealSecret]  = useState("");
  const [hashPreview,   setHashPreview]   = useState("");
  const [copied,        setCopied]        = useState(false);
  const [isClosing,     setIsClosing]     = useState(false);
  const [isCommitting,  setIsCommitting]  = useState(false);
  const [isRevealing,   setIsRevealing]   = useState(false);

  if (!isOwner) return null;

  const phase     = contractState?.phase ?? -1;
  const canClose  = phase === 0;
  const canCommit = phase === 1;
  const canReveal = phase === 2;

  const handleClose = async () => {
    setIsClosing(true);
    const id = toast.loading("Closing ticket sales…");
    try {
      const { hash } = await actions.closeSale();
      toast.success(<span>Sale closed.<TxLink hash={hash} /></span>, { id, duration: 10000 });
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsClosing(false);
    }
  };

  const handleCommit = async () => {
    if (!commitSecret.trim()) { toast.error("Enter a secret phrase."); return; }
    setIsCommitting(true);
    const id = toast.loading("Submitting commit hash…");
    try {
      const { hash } = await actions.commitHash(commitSecret);
      toast.success(<span>Hash committed.<TxLink hash={hash} /></span>, { id, duration: 10000 });
      setCommitSecret("");
      setHashPreview("");
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReveal = async () => {
    if (!revealSecret.trim()) { toast.error("Enter the original secret."); return; }
    setIsRevealing(true);
    const id = toast.loading("Revealing & drawing winner…");
    try {
      const { hash } = await actions.revealAndDraw(revealSecret);
      toast.success(<span>Winner drawn! 🎉<TxLink hash={hash} /></span>, { id, duration: 14000 });
      setRevealSecret("");
    } catch (err: unknown) {
      toast.error((err as Error).message, { id });
    } finally {
      setIsRevealing(false);
    }
  };

  const onSecretChange = (val: string) => {
    setCommitSecret(val);
    if (val.trim()) {
      try { setHashPreview(buildCommitHash(val)); } catch { setHashPreview(""); }
    } else {
      setHashPreview("");
    }
  };

  const copyHash = () => {
    if (!hashPreview) return;
    navigator.clipboard.writeText(hashPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="animate-slide-up-d2 rounded-2xl border border-laccent/15 bg-lsurface shadow-lglow">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-lborder px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-laccent/10">
          <ShieldCheck className="h-4 w-4 text-laccent" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ltext">
            Admin Controls
          </h2>
          <p className="text-[11px] text-ldim">Visible to contract owner only</p>
        </div>
        <span className="rounded-full bg-laccent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-laccent ring-1 ring-laccent/20">
          Owner
        </span>
      </div>

      <div className="space-y-3 p-5">

        {/* ── 1. Close Sale ─────────────────────────────────────────── */}
        <ActionRow
          icon={<Lock className="h-3.5 w-3.5" />}
          title="Close Sale"
          subtitle="Stop ticket purchases · Phase: Open"
          available={canClose}
        >
          <p className="mb-4 text-xs text-lsubtle">
            Once closed, no more tickets can be purchased. You will then be able
            to commit a secret hash.
          </p>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 py-2.5 text-sm font-semibold text-orange-400 transition-all hover:bg-orange-500/20 active:scale-95 disabled:opacity-50"
          >
            {isClosing
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-400" />
              : <Lock className="h-3.5 w-3.5" />}
            {isClosing ? "Closing…" : "Close Sale"}
          </button>
        </ActionRow>

        {/* ── 2. Commit Hash ────────────────────────────────────────── */}
        <ActionRow
          icon={<Hash className="h-3.5 w-3.5" />}
          title="Commit Hash"
          subtitle="Submit keccak256(secret) on-chain · Phase: Closed"
          available={canCommit}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ldim">
                Secret Phrase
              </label>
              <input
                type="text"
                value={commitSecret}
                onChange={(e) => onSecretChange(e.target.value)}
                placeholder="Enter a secret string…"
                disabled={isCommitting}
                className="w-full rounded-lg border border-lborder bg-lsurface px-3.5 py-2.5 text-sm text-ltext placeholder-ldim outline-none transition-all focus:border-laccent/60 focus:ring-2 focus:ring-laccent/15 disabled:opacity-50"
              />
            </div>

            {/* Hash preview */}
            {hashPreview && (
              <div className="rounded-lg border border-lborder bg-lbg p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ldim">
                    Hash Preview (on-chain value)
                  </span>
                  <button onClick={copyHash} className="flex items-center gap-1 text-[10px] text-ldim hover:text-lsubtle">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="break-all font-mono text-[11px] leading-relaxed text-lsubtle">
                  {hashPreview}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/8 px-3 py-2.5 text-[11px] text-yellow-400/80">
              ⚠ Save your secret securely — you need it in the Reveal step.
            </div>

            <button
              onClick={handleCommit}
              disabled={isCommitting || !commitSecret.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-laccent py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:opacity-50"
            >
              {isCommitting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Hash className="h-3.5 w-3.5" />}
              {isCommitting ? "Committing…" : "Submit Commit Hash"}
            </button>
          </div>
        </ActionRow>

        {/* ── 3. Reveal & Draw ──────────────────────────────────────── */}
        <ActionRow
          icon={<Eye className="h-3.5 w-3.5" />}
          title="Reveal & Draw"
          subtitle="Prove secret, select winner · Phase: Committed"
          available={canReveal}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ldim">
                Original Secret (used during Commit)
              </label>
              <input
                type="text"
                value={revealSecret}
                onChange={(e) => setRevealSecret(e.target.value)}
                placeholder="Enter the same secret used to commit…"
                disabled={isRevealing}
                className="w-full rounded-lg border border-lborder bg-lsurface px-3.5 py-2.5 text-sm text-ltext placeholder-ldim outline-none transition-all focus:border-laccent/60 focus:ring-2 focus:ring-laccent/15 disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleReveal}
              disabled={isRevealing || !revealSecret.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
            >
              {isRevealing
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Eye className="h-3.5 w-3.5" />}
              {isRevealing ? "Drawing Winner…" : "Reveal & Draw Winner"}
            </button>
          </div>
        </ActionRow>
      </div>
    </section>
  );
}
