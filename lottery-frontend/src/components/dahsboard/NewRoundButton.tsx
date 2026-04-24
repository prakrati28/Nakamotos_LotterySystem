"use client";

import { Plus } from "lucide-react";
import type { DbRound } from "@/hooks/useOwnerApi";

interface NewRoundButtonProps {
  currentRound: number | undefined;
  rounds: DbRound[];
  onStart: () => Promise<Record<string, unknown>>;
  pending: boolean;
}

export default function NewRoundButton({
  currentRound,
  rounds,
  onStart,
  pending,
}: NewRoundButtonProps) {
  const currentDbRound = rounds.find((r) => r.id === currentRound);
  const canStart =
    !currentDbRound || ["Drawn", "Slashed"].includes(currentDbRound.phase);

  return (
    <button
      onClick={onStart}
      disabled={!canStart || pending}
      title={
        !canStart
          ? `Current round must be Drawn or Slashed (currently ${currentDbRound?.phase ?? "unknown"})`
          : "Start a new lottery round"
      }
      className="flex items-center gap-2 rounded-xl bg-laccent px-3 md:px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {pending ? "Starting…" : "Start New Round"}
    </button>
  );
}
