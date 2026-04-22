/**
 * useContract — client-side hook for the user-facing lottery app.
 *
 * READ strategy: fetches from /api/rounds/[roundId] (server reads the chain
 * via RPC, no wallet needed, works even when wallet is disconnected).
 *
 * WRITE strategy: only user-callable functions go through MetaMask here:
 *   buyTicket, claimPrize(roundId), claimRefund(roundId), slashOwner
 *
 * Owner-only writes (closeSale, commitHash, revealAndDraw, startNewRound)
 * live in useOwnerApi and are called server-side via /api/owner/* routes.
 */

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { LOTTERY_ABI } from "@/abi/lottery";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { parseContractError } from "@/lib/utils";
import type { WalletState } from "./useWallet";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoundState {
  roundId: number;
  phase: string; // "Open" | "SaleClosed" | "Committed" | "Drawn" | "Slashed"
  prizePool: string; // ETH string e.g. "1.25"
  prizePoolWei: string;
  totalTickets: number;
  winner: string; // address or ZERO_ADDRESS
  ticketPrice: string; // ETH string
  ticketPriceWei: string;
  targetBlock: number;
  currentBlock: number;
  blocksUntilReveal: number;
  revealWindowExpiry: number;
  isRevealWindowOpen: boolean;
  prizeClaimed: boolean;
  // User-specific (added client-side after fetch)
  userTickets: number;
}

export interface TxResult {
  hash: string;
}

export interface UseContractReturn {
  roundState: RoundState | undefined;
  currentRound: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refreshState: () => void;
  buyTicket: (valueEth: string) => Promise<TxResult>;
  claimPrize: (roundId: number) => Promise<TxResult>;
  claimRefund: (roundId: number) => Promise<TxResult>;
  slashOwner: () => Promise<TxResult>;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

/** Fetch current round number directly from the chain (no wallet needed) */
async function fetchCurrentRound(): Promise<number> {
  if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured.");
  // Use a public RPC provider for read-only — no wallet needed
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL ?? "",
  );
  const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, provider);
  const round = await contract.currentRound();
  return Number(round);
}

/** Fetch round state from our Next.js API (server reads RPC with OWNER key) */
async function fetchRoundState(
  roundId: number,
  userAddress: string | null,
): Promise<RoundState> {
  const res = await fetch(`/api/rounds/${roundId}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  const data = (await res.json()) as RoundState;

  // Augment with user-specific ticket count (needs browser provider)
  if (userAddress && window.ethereum) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        LOTTERY_ABI,
        provider,
      );
      const tickets = await contract.userTickets(BigInt(roundId), userAddress);
      data.userTickets = Number(tickets);
    } catch {
      data.userTickets = 0;
    }
  } else {
    data.userTickets = 0;
  }

  return data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useContract(wallet: WalletState): UseContractReturn {
  // Step 1: get current round number
  const { data: currentRound } = useSWR(
    CONTRACT_ADDRESS ? "currentRound" : null,
    fetchCurrentRound,
    { refreshInterval: 20_000 },
  );

  // Step 2: get full round state for that round
  const roundKey =
    currentRound !== undefined
      ? ["roundState", currentRound, wallet.address]
      : null;

  const {
    data: roundState,
    error,
    isLoading,
    mutate,
  } = useSWR(
    roundKey,
    ([, id, addr]) => fetchRoundState(id as number, addr as string | null),
    { refreshInterval: 12_000, revalidateOnFocus: true },
  );

  // ── Write helpers ────────────────────────────────────────────────────────

  const getWriteContract = useCallback(() => {
    if (!wallet.signer) throw new Error("Wallet not connected.");
    if (!wallet.isCorrectNetwork) throw new Error("Wrong network selected.");
    return new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, wallet.signer);
  }, [wallet.signer, wallet.isCorrectNetwork]);

  const sendTx = useCallback(
    async (
      fn: () => Promise<ethers.ContractTransactionResponse>,
    ): Promise<TxResult> => {
      try {
        const tx = await fn();
        await tx.wait(1);
        mutate();
        return { hash: tx.hash };
      } catch (err) {
        throw new Error(parseContractError(err));
      }
    },
    [mutate],
  );

  // ── User-callable write functions ────────────────────────────────────────

  const buyTicket = useCallback(
    (valueEth: string) =>
      sendTx(() =>
        getWriteContract().buyTicket({ value: ethers.parseEther(valueEth) }),
      ),
    [sendTx, getWriteContract],
  );

  const claimPrize = useCallback(
    (roundId: number) =>
      sendTx(() => getWriteContract().claimPrize(BigInt(roundId))),
    [sendTx, getWriteContract],
  );

  const claimRefund = useCallback(
    (roundId: number) =>
      sendTx(() => getWriteContract().claimRefund(BigInt(roundId))),
    [sendTx, getWriteContract],
  );

  const slashOwner = useCallback(
    () => sendTx(() => getWriteContract().slashOwner()),
    [sendTx, getWriteContract],
  );

  const refreshState = useCallback(() => mutate(), [mutate]);

  return useMemo(
    () => ({
      roundState,
      currentRound,
      isLoading,
      error: error as Error | undefined,
      refreshState,
      buyTicket,
      claimPrize,
      claimRefund,
      slashOwner,
    }),
    [
      roundState,
      currentRound,
      isLoading,
      error,
      refreshState,
      buyTicket,
      claimPrize,
      claimRefund,
      slashOwner,
    ],
  );
}
