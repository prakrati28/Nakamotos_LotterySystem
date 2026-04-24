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
      <header className="sticky top-0 z-50 border-b border-lborder/60 bg-lbg/85 backdrop-blur-xl">
        <div className="mx-auto flex flex-col md:flex-row gap-2 max-w-7xl items-center justify-between px-3 py-3 md:px-6">
          <div className="flex items-center self-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-laccent/12 ring-1 ring-laccent/20">
              <LayoutDashboard className="h-4.5 w-4.5 text-laccent" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-ltext">
              Owner <span className="text-laccent">Dashboard</span>
            </span>
            {api.currentRound !== undefined && (
              <span className="rounded-full bg-laccent/12 px-3 py-1 text-xs font-bold text-laccent ring-1 ring-laccent/20">
                Round #{api.currentRound}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 self-end">
            <button
              onClick={api.refreshRounds}
              disabled={api.isLoadingRounds}
              className="flex items-center gap-2 rounded-xl border border-lborder px-4 py-2 text-sm font-medium text-lsubtle transition-all hover:border-lborderhi hover:text-ltext disabled:opacity-40"
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
              className="rounded-xl border border-lborder px-4 py-2 text-sm font-medium text-ldim transition-all hover:border-red-500/30 hover:text-red-400"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl border border-lborder px-4 py-2 text-sm font-medium text-lsubtle transition-all hover:text-ltext"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              User App
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 md:px-6 py-10">
        {api.roundsError && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm text-red-400">
            <strong>Error:</strong> {api.roundsError.message}
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ltext">
              Round Management
            </h1>
            <p className="mt-1.5 text-sm text-lsubtle">
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
            <p className="text-base text-lsubtle">
              No rounds found in the database.
            </p>
            <p className="mt-1.5 text-sm text-ldim">
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
