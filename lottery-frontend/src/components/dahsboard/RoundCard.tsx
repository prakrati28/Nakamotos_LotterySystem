"use client";

import { useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Hash,
  Eye,
  KeyRound,
  Clock,
  Trophy,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import type { DbRound, OwnerApiReturn } from "@/hooks/useOwnerApi";
import {
  PHASE_BADGE_STYLES,
  PHASE_LABELS,
  ETHERSCAN_BASE,
} from "@/lib/constants";
import { shortAddress, etherscanTx } from "@/lib/utils";
import AuditLog from "./AuditLog";

interface RoundCardProps {
  round: DbRound;
  isCurrentRound: boolean;
  api: OwnerApiReturn;
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-2 text-ldim hover:text-lsubtle"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function ActionButton({
  label,
  loadingLabel,
  icon,
  onClick,
  disabled,
  isLoading = false,
  variant = "default",
}: {
  label: string;
  loadingLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  isLoading?: boolean;
  variant?: "default" | "warn" | "success";
}) {
  const colors = {
    default: "bg-laccent hover:bg-laccenthi text-white",
    warn: "bg-orange-500 hover:bg-orange-400 text-white",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${colors[variant]}`}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        icon
      )}
      {isLoading ? loadingLabel : label}
    </button>
  );
}

export default function RoundCard({
  round,
  isCurrentRound,
  api,
}: RoundCardProps) {
  const [expanded, setExpanded] = useState(isCurrentRound);
  const [collateral, setCollateral] = useState("0.1");

  const phase = round.phase;
  const phaseStyle =
    PHASE_BADGE_STYLES[phase as any] ?? PHASE_BADGE_STYLES["Open" as any];
  const phaseLabel = PHASE_LABELS[phase as any] ?? phase;

  const isPendingSecret = api.pending[`secret-${round.id}`];
  const isPendingClose = api.pending[`close-${round.id}`];
  const isPendingCommit = api.pending[`commit-${round.id}`];
  const isPendingReveal = api.pending[`reveal-${round.id}`];

  const canClose = isCurrentRound && phase === "Open";
  const canSecret =
    isCurrentRound && ["Open", "SaleClosed"].includes(phase) && !round.secret;
  const canCommit =
    isCurrentRound && phase === "SaleClosed" && !!round.committedHash;
  const canReveal = isCurrentRound && phase === "Committed" && !!round.secret;

  const makeAction =
    (label: string, fn: () => Promise<Record<string, unknown>>) => async () => {
      const id = toast.loading(`${label}…`);
      try {
        const result = await fn();
        const msg = (result.message as string) ?? label + " succeeded.";
        const txHash = result.txHash as string | undefined;
        toast.success(
          txHash ? (
            <span>
              {msg}
              <TxLink hash={txHash} />
            </span>
          ) : (
            msg
          ),
          { id, duration: 10000 },
        );
      } catch (err: unknown) {
        toast.error((err as Error).message, { id });
      }
    };

  return (
    <div
      className={`rounded-2xl border bg-lsurface shadow-lcard transition-all ${
        isCurrentRound ? "border-laccent/25 shadow-lglow" : "border-lborder"
      }`}
    >
      {/* Card Header */}
      <div
        className="flex cursor-pointer items-center gap-4 px-3 md:px-6 py-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lborder bg-lcard font-mono text-sm font-bold text-lsubtle">
          {round.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-base font-semibold text-ltext">
              Round #{round.id}
            </span>
            {isCurrentRound && (
              <span className="rounded-full bg-laccent/12 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-laccent ring-1 ring-laccent/20">
                Current
              </span>
            )}
          </div>
          <p className="text-xs text-ldim mt-0.5">
            Created {new Date(round.createdAt).toLocaleDateString()}
            {round.winner && ` - Winner: ${shortAddress(round.winner)}`}
          </p>
        </div>
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${phaseStyle.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`} />
          {phaseLabel}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ldim" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ldim" />
        )}
      </div>

      {/* Expanded Body */}
      {expanded && (
        <div className="border-t border-lborder">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-px border-b border-lborder bg-lborder md:grid-cols-4">
            {[
              { label: "Phase", value: phaseLabel },
              {
                label: "Target Block",
                value: round.targetBlock ? `#${round.targetBlock}` : "—",
              },
              {
                label: "Winner",
                value: round.winner ? shortAddress(round.winner) : "—",
              },
              {
                label: "Prize Pool",
                value: round.prizePool
                  ? `${(Number(round.prizePool) / 1e9)} Gwei`
                  : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-lsurface px-3 md:px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ldim">
                  {label}
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-ltext">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Committed hash */}
          {round.committedHash && (
            <div className="border-b border-lborder px-3 md:px-6 py-3.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ldim">
                Committed Hash
              </p>
              <div className="flex items-center gap-1">
                <span className="break-all font-mono text-xs text-lsubtle">
                  {round.committedHash}
                </span>
                <CopyButton value={round.committedHash} />
              </div>
            </div>
          )}

          {/* Tx links */}
          {(round.closeSaleTxHash ||
            round.commitTxHash ||
            round.revealTxHash) && (
            <div className="flex flex-wrap gap-4 border-b border-lborder px-3 md:px-6 py-3.5">
              {round.closeSaleTxHash && (
                <a
                  href={etherscanTx(round.closeSaleTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-laccent hover:text-laccenthi"
                >
                  Close Sale Tx <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {round.commitTxHash && (
                <a
                  href={etherscanTx(round.commitTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-laccent hover:text-laccenthi"
                >
                  Commit Tx <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {round.revealTxHash && (
                <a
                  href={etherscanTx(round.revealTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-laccent hover:text-laccenthi"
                >
                  Reveal Tx <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Owner Actions */}
          {isCurrentRound && (
            <div className="space-y-4 p-3 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-ldim">
                Owner Actions
              </p>

              <div className="rounded-xl border border-lborder bg-lcard p-2 md:p-4">
                <div className="flex flex-wrap gap-4">
                  {/* Step 1: Close Sale */}
                  <div
                    className={`flex-1 min-w-[200px] rounded-xl border p-2 md:p-4 ${canClose ? "border-orange-500/20 bg-orange-500/5" : "border-lborder opacity-50"}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-semibold text-ltext">
                        1. Close Sale
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-ldim">
                      Stop ticket purchases. Phase must be Open.
                    </p>
                    <ActionButton
                      label="Close Sale"
                      loadingLabel="Closing…"
                      icon={<Lock className="h-3.5 w-3.5" />}
                      onClick={makeAction("Close sale", () =>
                        api.closeSale(round.id),
                      )}
                      disabled={!canClose}
                      isLoading={isPendingClose}
                      variant="warn"
                    />
                  </div>

                  {/* Step 2: Generate Secret */}
                  <div
                    className={`flex-1 min-w-[200px] rounded-xl border p-2 md:p-4 ${canSecret ? "border-yellow-500/20 bg-yellow-500/5" : "border-lborder opacity-50"}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-semibold text-ltext">
                        2. Generate Secret
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-ldim">
                      {round.secret ? (
                        <span className="text-emerald-400">
                          ✓ Secret already stored
                        </span>
                      ) : (
                        "Server generates & stores a random 32-byte secret."
                      )}
                    </p>
                    <ActionButton
                      label={round.secret ? "Regenerate" : "Generate Secret"}
                      loadingLabel="Generating…"
                      icon={<KeyRound className="h-3.5 w-3.5" />}
                      onClick={makeAction("Generate secret", () =>
                        api.generateSecret(round.id),
                      )}
                      disabled={!canSecret}
                      isLoading={isPendingSecret}
                    />
                  </div>

                  {/* Step 3: Commit Hash */}
                  <div
                    className={`flex-1 min-w-[200px] rounded-xl border p-2 md:p-4 ${canCommit ? "border-laccent/20 bg-laccent/5" : "border-lborder opacity-50"}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Hash className="h-4 w-4 text-laccent" />
                      <span className="text-sm font-semibold text-ltext">
                        3. Commit Hash
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-ldim">
                      Post keccak256(secret) on-chain with collateral bond.
                    </p>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-sm text-ldim">Collateral:</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-ldim">
                          Ξ
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={collateral}
                          onChange={(e) => setCollateral(e.target.value)}
                          className="w-full rounded-lg border border-lborder bg-lbg pl-7 pr-2 py-2 font-mono text-xs text-ltext outline-none focus:border-laccent/60"
                          disabled={!canCommit}
                        />
                      </div>
                      <span className="text-sm text-ldim">ETH</span>
                    </div>
                    <ActionButton
                      label="Commit Hash"
                      loadingLabel="Committing…"
                      icon={<Hash className="h-3.5 w-3.5" />}
                      onClick={makeAction("Commit hash", () =>
                        api.commitHash(round.id, collateral),
                      )}
                      disabled={!canCommit}
                      isLoading={isPendingCommit}
                    />
                  </div>

                  {/* Step 4: Reveal & Draw */}
                  <div
                    className={`flex-1 min-w-[200px] rounded-xl border p-2 md:p-4 ${canReveal ? "border-emerald-500/20 bg-emerald-500/5" : "border-lborder opacity-50"}`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-ltext">
                        4. Reveal & Draw
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-ldim">
                      Reveal the stored secret after the target block.
                      {round.targetBlock && (
                        <span className="block mt-1.5 font-mono text-xs text-yellow-400">
                          Target: #{round.targetBlock}
                        </span>
                      )}
                    </p>
                    <ActionButton
                      label="Reveal & Draw"
                      loadingLabel="Revealing…"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={makeAction("Reveal and draw", () =>
                        api.revealAndDraw(round.id),
                      )}
                      disabled={!canReveal}
                      isLoading={isPendingReveal}
                      variant="success"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {round.userlog.length > 0 && (
            <div className="border-t border-lborder px-3 md:px-6 py-3 md:py-6">
              <AuditLog logs={round.userlog} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
