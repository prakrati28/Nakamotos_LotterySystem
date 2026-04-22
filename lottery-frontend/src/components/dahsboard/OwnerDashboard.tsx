"use client";

import { useOwnerApi } from "@/hooks/useOwnerApi";
import { RefreshCw, LayoutDashboard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ApiKeyGate from "./Apikeygate";
import NewRoundButton from "./NewRoundButton";
import RoundCard from "./RoundCard";

export default function OwnerDashboard() {
  const api = useOwnerApi();

  if (!api.isAuthed) {
    return <ApiKeyGate onSubmit={api.setApiKey} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-lbg">
      {/* ── Dashboard Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-lborder bg-lbg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-laccent/10">
              <LayoutDashboard className="h-4 w-4 text-laccent" />
            </div>
            <div>
              <span className="font-display text-[17px] font-bold tracking-tight text-ltext">
                Owner <span className="text-laccent">Dashboard</span>
              </span>
            </div>
            {api.currentRound !== undefined && (
              <span className="rounded-full bg-laccent/10 px-2.5 py-1 text-[11px] font-bold text-laccent ring-1 ring-laccent/20">
                Round #{api.currentRound}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={api.refreshRounds}
              disabled={api.isLoadingRounds}
              className="flex items-center gap-2 rounded-lg border border-lborder px-3 py-2 text-sm text-lsubtle transition-all hover:border-lborderhi hover:text-ltext disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${api.isLoadingRounds ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("owner_api_key");
                window.location.reload();
              }}
              className="rounded-lg border border-lborder px-3 py-2 text-sm text-ldim transition-all hover:border-red-500/30 hover:text-red-400"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-lborder px-3 py-2 text-sm text-lsubtle transition-all hover:text-ltext"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              User App
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {/* Errors */}
        {api.roundsError && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm text-red-400">
            <strong>Error:</strong> {api.roundsError.message}
          </div>
        )}

        {/* Top bar: current round info + start new round */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ltext">
              Round Management
            </h1>
            <p className="mt-1 text-sm text-lsubtle">
              All owner actions are executed server-side. The private key never
              leaves the server.
            </p>
          </div>
          <NewRoundButton
            currentRound={api.currentRound}
            rounds={api.rounds}
            onStart={api.startNewRound}
            pending={api.pending["new-round"]}
          />
        </div>

        {/* Round cards */}
        {api.isLoadingRounds && api.rounds.length === 0 ? (
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-lborder bg-lcard"
              />
            ))}
          </div>
        ) : api.rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-lborder bg-lsurface py-20 text-center">
            <p className="text-lsubtle">No rounds found in the database.</p>
            <p className="mt-1 text-sm text-ldim">
              Start a new round to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {api.rounds.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                isCurrentRound={round.id === api.currentRound}
                api={api}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
