"use client";

import { Users, Trophy, Layers, RefreshCw } from "lucide-react";
import type { ContractState } from "@/hooks/useContract";
import { PHASE_LABELS, PHASE_COLORS } from "@/lib/constants";
import { formatEth, shortAddress, etherscanAddr } from "@/lib/utils";

interface LotteryStatusProps {
  contractState: ContractState | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-bold text-text">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default function LotteryStatus({
  contractState,
  isLoading,
  onRefresh,
}: LotteryStatusProps) {
  const phase = contractState?.phase ?? null;
  const phaseLabel = phase !== null ? (PHASE_LABELS[phase] ?? "Unknown") : "—";
  const phaseColor = phase !== null ? (PHASE_COLORS[phase] ?? "text-subtle") : "text-subtle";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-slide-up">
      {/* Card Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-wider text-text">
            LOTTERY STATUS
          </h2>
          <p className="mt-0.5 text-sm text-muted">Live contract state</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-all hover:border-accent/40 hover:text-accent disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading && !contractState ? (
        // Skeleton
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : contractState ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label="Phase"
              value={
                <span className={phaseColor}>{phaseLabel}</span>
              }
              sub={`Phase ${phase}`}
            />
            <StatCard
              icon={<span className="text-base">Ξ</span>}
              label="Prize Pool"
              value={`${formatEth(contractState.prizePool)} ETH`}
              sub="Total collected"
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Participants"
              value={contractState.participantCount.toString()}
              sub="Unique tickets"
            />
            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="Winner"
              value={
                contractState.winner &&
                contractState.winner !== "0x0000000000000000000000000000000000000000" ? (
                  <a
                    href={etherscanAddr(contractState.winner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2 hover:text-accentDim"
                  >
                    {shortAddress(contractState.winner)}
                  </a>
                ) : (
                  <span className="text-muted text-base">Not drawn</span>
                )
              }
            />
          </div>

          {/* Phase progress bar */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Open</span>
              <span>Sale Closed</span>
              <span>Committed</span>
              <span>Drawn</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${((phase ?? 0) / 3) * 100}%` }}
              />
              {/* Phase dots */}
              <div className="absolute inset-0 flex items-center justify-between px-0">
                {[0, 1, 2, 3].map((p) => (
                  <div
                    key={p}
                    className={`h-3 w-3 rounded-full border-2 transition-colors ${
                      (phase ?? -1) >= p
                        ? "border-accent bg-accent"
                        : "border-border bg-surface"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-muted py-8">
          Could not load contract state. Check the contract address and network.
        </p>
      )}
    </div>
  );
}
