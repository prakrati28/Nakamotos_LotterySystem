"use client";

import { Users, Trophy, RefreshCw, TrendingUp, Layers } from "lucide-react";
import type { ContractState } from "@/hooks/useContract";
import { PHASE_LABELS, PHASE_BADGE_STYLES, ZERO_ADDRESS } from "@/lib/constants";
import { formatEth, shortAddress, etherscanAddr } from "@/lib/utils";

interface LotteryStatusProps {
  contractState: ContractState | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
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
      className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
        accent
          ? "border-laccent/20 bg-l-gradient-card bg-lcard shadow-lglow"
          : "border-lborder bg-lcard shadow-lcard"
      }`}
    >
      {/* Top row */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ldim">
          {label}
        </span>
        <span className={`${accent ? "text-laccent" : "text-ldim"}`}>{icon}</span>
      </div>
      {/* Value */}
      <div className="text-xl font-semibold tracking-tight text-ltext">{value}</div>
      {sub && <div className="mt-1 text-xs text-ldim">{sub}</div>}

      {/* Subtle corner accent */}
      {accent && (
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-laccent/5 blur-2xl" />
      )}
    </div>
  );
}

export default function LotteryStatus({
  contractState,
  isLoading,
  onRefresh,
}: LotteryStatusProps) {
  const phase      = contractState?.phase ?? null;
  const phaseLabel = phase !== null ? (PHASE_LABELS[phase] ?? "Unknown") : null;
  const phaseStyle = phase !== null ? PHASE_BADGE_STYLES[phase] : null;

  const hasWinner =
    contractState?.winner &&
    contractState.winner !== ZERO_ADDRESS;

  return (
    <section className="animate-slide-up rounded-2xl border border-lborder bg-lsurface shadow-lpanel">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-lborder px-3 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-laccent/10">
            <Layers className="h-4 w-4 text-laccent" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-ltext">
              Lottery Overview
            </h2>
            <p className="text-[11px] text-ldim">Live contract state · refreshes every 15s</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Phase badge */}
          {phaseStyle && phaseLabel && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${phaseStyle.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`} />
              {phaseLabel}
            </span>
          )}
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-lborder text-ldim transition-all hover:border-lborderhi hover:text-ltext disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-6">
        {isLoading && !contractState ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24" />
            ))}
          </div>
        ) : contractState ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={<Layers className="h-4 w-4" />}
                label="Current Phase"
                value={phaseLabel ?? "—"}
                sub={`Stage ${phase} of 3`}
                accent
              />
              <StatCard
                icon={<span className="text-base font-light">Ξ</span>}
                label="Prize Pool"
                value={
                  <span className="flex items-baseline gap-1">
                    <span>{formatEth(contractState.prizePool)}</span>
                    <span className="text-sm font-normal text-ldim">ETH</span>
                  </span>
                }
                sub="Total collected"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Participants"
                value={contractState.participantCount.toString()}
                sub="Unique ticket holders"
              />
              <StatCard
                icon={<Trophy className="h-4 w-4" />}
                label="Winner"
                value={
                  hasWinner ? (
                    <a
                      href={etherscanAddr(contractState.winner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-base text-laccent underline-offset-2 hover:underline"
                    >
                      {shortAddress(contractState.winner)}
                    </a>
                  ) : (
                    <span className="text-base font-normal text-ldim">—</span>
                  )
                }
                sub={hasWinner ? "Prize claimable" : "Not yet drawn"}
              />
            </div>

            {/* ── Phase progress track ──────────────────────────────── */}
            <div className="mt-6 rounded-xl border border-lborder bg-lcard p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-ldim">
                  Round Progress
                </span>
                <span className="text-[11px] text-ldim">
                  {phase !== null ? `Step ${phase + 1} of 4` : "—"}
                </span>
              </div>

              {/* Steps */}
              <div className="relative flex items-center">
                {/* Connecting line */}
                <div className="absolute left-0 right-0 top-[11px] h-px bg-lborder" />
                <div
                  className="absolute left-0 top-[11px] h-px bg-laccent transition-all duration-700"
                  style={{ width: `${phase !== null ? (phase / 3) * 100 : 0}%` }}
                />

                {[
                  { label: "Open",       n: 0 },
                  { label: "Closed",     n: 1 },
                  { label: "Committed",  n: 2 },
                  { label: "Drawn",      n: 3 },
                ].map(({ label, n }) => {
                  const done    = (phase ?? -1) > n;
                  const current = phase === n;
                  return (
                    <div key={n} className="relative flex flex-1 flex-col items-center gap-2">
                      <div
                        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all ${
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
                        className={`text-[10px] font-medium ${
                          current ? "text-laccent" : done ? "text-lsubtle" : "text-ldim"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-ldim">
              Could not load contract data. Verify the contract address and network.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
