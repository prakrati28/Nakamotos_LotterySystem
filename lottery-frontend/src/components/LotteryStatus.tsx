"use client";

import { Trophy, RefreshCw, Layers, Clock, Ticket } from "lucide-react";
import type { RoundState } from "@/hooks/useContract";
import {
  PHASE_LABELS,
  PHASE_BADGE_STYLES,
  PHASE_STEPS,
  PHASE_STEP_LABELS,
  ZERO_ADDRESS,
} from "@/lib/constants";
import {
  formatEth,
  shortAddress,
  etherscanAddr,
  formatBlockCountdown,
} from "@/lib/utils";
import { Key } from "react";

interface LotteryStatusProps {
  roundState: RoundState | undefined;
  currentRound: number | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-2.5 sm:p-5 transition-all ${
        accent
          ? "border-laccent/25 bg-l-gradient-card bg-lcard shadow-lglow"
          : "border-lborder bg-lcard"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-ldim">
          {label}
        </span>
        <span className={`${accent ? "text-laccent" : "text-ldim"}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-ltext">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-sm text-ldim">{sub}</div>}
      {accent && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-laccent/8 blur-2xl" />
      )}
    </div>
  );
}

export default function LotteryStatus({
  roundState,
  currentRound,
  isLoading,
  onRefresh,
}: LotteryStatusProps) {
  const phase = roundState?.phase ?? null;
  const phaseLabel = phase ? (PHASE_LABELS[phase as any] ?? phase) : null;
  const phaseStyle = phase ? PHASE_BADGE_STYLES[phase as any] : null;
  const hasWinner = roundState?.winner && roundState.winner !== ZERO_ADDRESS;
  const isSlashed = phase === "Slashed";

  const showCountdown = phase === "Committed" && roundState;
  const blocksLeft = roundState?.blocksUntilReveal ?? 0;
  const windowExpired =
    showCountdown && roundState.currentBlock > roundState.revealWindowExpiry;
  const canReveal = roundState?.isRevealWindowOpen;

  return (
    <section className="animate-slide-up rounded-2xl border border-lborder bg-lsurface shadow-lpanel">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between border-b border-lborder px-3 md:px-6 py-4">
        <div className="flex items-center gap-3 self-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-laccent/12 ring-1 ring-laccent/20">
            <Layers className="h-4.5 w-4.5 text-laccent" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-ltext">
              Round {currentRound !== undefined ? `#${currentRound}` : "—"}{" "}
              Overview
            </h2>
            <p className="text-xs text-ldim">
              Live contract state · auto-refreshes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end">
          {phaseStyle && phaseLabel && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${phaseStyle.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`} />
              {phaseLabel}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-lborder text-ldim transition-all hover:border-lborderhi hover:text-lsubtle disabled:opacity-40"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="p-3 md:p-6">
        {isLoading && !roundState ? (
          <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : roundState ? (
          <>
            {/* Slashed warning */}
            {isSlashed && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/8 px-2 md:px-4 py-4 text-red-400">
                <span className="text-xl">⚠</span>
                <div>
                  <p className="font-semibold text-base">Owner Slashed</p>
                  <p className="mt-1 text-sm text-red-400/75">
                    The owner failed to reveal within the 250-block window.
                    Their collateral was confiscated. Participants can claim a
                    full refund.
                  </p>
                </div>
              </div>
            )}

            {/* Reveal countdown */}
            {showCountdown && (
              <div
                className={`mb-5 flex items-center gap-3 rounded-xl border px-2 md:px-4 py-3.5 ${
                  windowExpired
                    ? "border-red-500/30 bg-red-500/8 text-red-400"
                    : canReveal
                      ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                      : "border-yellow-500/30 bg-yellow-500/8 text-yellow-400"
                }`}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <div className="text-sm">
                  {windowExpired ? (
                    <span className="font-semibold">
                      Reveal window expired — owner can be slashed!
                    </span>
                  ) : canReveal ? (
                    <span className="font-semibold">
                      Reveal window is open — owner should reveal now.
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold">
                        Waiting for target block.
                      </span>{" "}
                      {blocksLeft} blocks remaining (~
                      {formatBlockCountdown(blocksLeft)}). Target: #
                      {roundState.targetBlock}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
              <StatCard
                icon={<Layers className="h-4.5 w-4.5" />}
                label="Phase"
                value={phaseLabel ?? "—"}
                sub={`Round #${currentRound}`}
                accent
              />
              <StatCard
                icon={<span className="text-lg font-light">Ξ</span>}
                label="Prize Pool"
                value={
                  <span className="flex items-baseline gap-1.5">
                    <span>
                      {(formatEth(roundState.prizePoolWei) as any) / 1e9}
                    </span>
                    <span className="text-base font-normal text-ldim">Gwei</span>
                  </span>
                }
                sub="Total collected"
              />
              <StatCard
                icon={<Ticket className="h-4.5 w-4.5" />}
                label="Tickets Sold"
                value={roundState.totalTickets.toString()}
                sub={`@ ${(formatEth(roundState.ticketPriceWei) as any) / 1e9} Gwei each`}
              />
              <StatCard
                icon={<Trophy className="h-4.5 w-4.5" />}
                label="Winner"
                value={
                  hasWinner ? (
                    <a
                      href={etherscanAddr(roundState.winner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-lg text-laccent underline-offset-2 hover:underline"
                    >
                      {shortAddress(roundState.winner)}
                    </a>
                  ) : (
                    <span className="text-lg font-normal text-ldim">—</span>
                  )
                }
                sub={
                  hasWinner
                    ? roundState.prizeClaimed
                      ? "Prize claimed ✓"
                      : "Prize claimable"
                    : "Not yet drawn"
                }
              />
            </div>

            {/* Phase progress stepper */}
            <div className="mt-6 rounded-xl border border-lborder bg-lcard p-2.5 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-ldim">
                  Round Progress
                </span>
                <span className="font-mono text-xs text-ldim">
                  Block #{roundState.currentBlock.toLocaleString()}
                </span>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-0 right-0 top-[12px] h-px bg-lborder" />
                <div
                  className={`absolute left-0 top-[12px] h-px transition-all duration-700 ${isSlashed ? "bg-red-400" : "bg-laccent"}`}
                  style={{
                    width: `${Math.min(100, (PHASE_STEPS.indexOf(phase as (typeof PHASE_STEPS)[number]) / (PHASE_STEPS.length - 1)) * 100)}%`,
                  }}
                />
                {PHASE_STEPS.map((step: Key | null | undefined, n: number) => {
                  const stepIdx = PHASE_STEPS.indexOf(
                    phase as (typeof PHASE_STEPS)[number],
                  );
                  const done = stepIdx > n;
                  const current = stepIdx === n;
                  return (
                    <div
                      key={step}
                      className="relative flex flex-1 flex-col items-center gap-2.5"
                    >
                      <div
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                          done
                            ? "border-laccent bg-laccent text-white"
                            : current
                              ? "border-laccent bg-lbg text-laccent ring-4 ring-laccent/20"
                              : "border-lborder bg-lbg text-ldim"
                        }`}
                      >
                        {done ? "✓" : n + 1}
                      </div>
                      <span
                        className={`text-xs font-medium ${current ? "text-laccent" : done ? "text-lsubtle" : "text-ldim"}`}
                      >
                        {PHASE_STEP_LABELS[step as any]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-base text-ldim">
              Could not load contract data. Verify the contract address and
              network.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
