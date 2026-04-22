"use client";

/**
 * useOwnerApi — hook for the owner dashboard.
 *
 * All owner writes are executed SERVER-SIDE via the Next.js API routes.
 * The private key never touches the browser. The owner authenticates with
 * the OWNER_API_KEY (set in .env.local, typed in the dashboard UI).
 *
 * The owner's MetaMask wallet is NOT used for any on-chain writes — the
 * server wallet (OWNER_PRIVATE_KEY) sends all owner transactions.
 */

import { useCallback, useState } from "react";
import useSWR from "swr";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbRound {
  id: number;
  phase: string;
  secret: string | null;
  committedHash: string | null;
  collateral: string | null;
  targetBlock: string | null;
  revealedAt: string | null;
  revealTxHash: string | null;
  closeSaleTxHash: string | null;
  commitTxHash: string | null;
  winner: string | null;
  prizePool: string | null;
  createdAt: string;
  updatedAt: string;
  userlog: AuditLog[];
  onChainPhase?: string;
}

export interface AuditLog {
  id: number;
  roundId: number;
  action: string;
  txHash: string | null;
  createdAt: string;
}

export interface OwnerApiReturn {
  // Auth
  apiKey: string;
  setApiKey: (k: string) => void;
  isAuthed: boolean;

  // Round list
  rounds: DbRound[];
  currentRound: number | undefined;
  isLoadingRounds: boolean;
  roundsError: Error | undefined;
  refreshRounds: () => void;

  // Actions — all return { message, txHash, ... }
  generateSecret: (roundId: number) => Promise<Record<string, unknown>>;
  closeSale: (roundId: number) => Promise<Record<string, unknown>>;
  commitHash: (
    roundId: number,
    collateralEth?: string,
  ) => Promise<Record<string, unknown>>;
  revealAndDraw: (roundId: number) => Promise<Record<string, unknown>>;
  startNewRound: () => Promise<Record<string, unknown>>;

  // Loading states per action
  pending: Record<string, boolean>;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function ownerFetch(
  path: string,
  apiKey: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-owner-key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `API error ${res.status}`);
  return data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOwnerApi(): OwnerApiReturn {
  const [apiKey, setApiKey] = useState<string>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("owner_api_key") ?? "")
      : "",
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Persist key in localStorage (only the owner uses this page)
  const handleSetApiKey = useCallback((k: string) => {
    setApiKey(k);
    if (typeof window !== "undefined") {
      localStorage.setItem("owner_api_key", k);
    }
  }, []);

  const isAuthed = apiKey.length > 0;

  // Fetch all rounds from DB + current on-chain round
  const { data, error, isLoading, mutate } = useSWR(
    isAuthed ? ["ownerRounds", apiKey] : null,
    async ([, key]) => {
      const res = await ownerFetch("/api/owner/rounds", key as string);
      return res as { rounds: DbRound[]; currentRound: number };
    },
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );

  // ── Action factory ───────────────────────────────────────────────────────

  function makeAction(key: string, fn: () => Promise<Record<string, unknown>>) {
    return async () => {
      setPending((p) => ({ ...p, [key]: true }));
      try {
        const result = await fn();
        mutate(); // refresh rounds list
        return result;
      } finally {
        setPending((p) => ({ ...p, [key]: false }));
      }
    };
  }

  const generateSecret = useCallback(
    (roundId: number) =>
      makeAction(`secret-${roundId}`, () =>
        ownerFetch(`/api/owner/rounds/${roundId}/secret`, apiKey, "POST"),
      )(),
    [apiKey],
  );

  const closeSale = useCallback(
    (roundId: number) =>
      makeAction(`close-${roundId}`, () =>
        ownerFetch(`/api/owner/rounds/${roundId}/close-sale`, apiKey, "POST"),
      )(),
    [apiKey],
  );

  const commitHash = useCallback(
    (roundId: number, collateralEth?: string) =>
      makeAction(`commit-${roundId}`, () =>
        ownerFetch(
          `/api/owner/rounds/${roundId}/commit`,
          apiKey,
          "POST",
          collateralEth ? { collateralEth } : undefined,
        ),
      )(),
    [apiKey],
  );

  const revealAndDraw = useCallback(
    (roundId: number) =>
      makeAction(`reveal-${roundId}`, () =>
        ownerFetch(`/api/owner/rounds/${roundId}/reveal`, apiKey, "POST"),
      )(),
    [apiKey],
  );

  const startNewRound = useCallback(
    () =>
      makeAction("new-round", () =>
        ownerFetch("/api/owner/rounds/new", apiKey, "POST"),
      )(),
    [apiKey],
  );

  const refreshRounds = useCallback(() => mutate(), [mutate]);

  return {
    apiKey,
    setApiKey: handleSetApiKey,
    isAuthed,
    rounds: data?.rounds ?? [],
    currentRound: data?.currentRound,
    isLoadingRounds: isLoading,
    roundsError: error as Error | undefined,
    refreshRounds,
    generateSecret,
    closeSale,
    commitHash,
    revealAndDraw,
    startNewRound,
    pending,
  };
}
