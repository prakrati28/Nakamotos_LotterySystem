"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { LOTTERY_ABI } from "@/abi/lottery";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { parseContractError, buildCommitHash, encodeSecret } from "@/lib/utils";
import type { WalletState } from "./useWallet";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContractState {
  phase: number;
  prizePool: bigint;
  participantCount: bigint;
  winner: string;
  owner: string;
  ticketPrice: bigint;
  hasTicket: boolean;
}

export interface TxResult {
  hash: string;
}

export interface UseContractReturn {
  contractState: ContractState | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refreshState: () => void;
  buyTicket: (valueEth: string) => Promise<TxResult>;
  closeSale: () => Promise<TxResult>;
  commitHash: (secret: string) => Promise<TxResult>;
  revealAndDraw: (secret: string) => Promise<TxResult>;
  claimPrize: () => Promise<TxResult>;
}

// ── Read-only provider (no signer needed for fetching) ───────────────────────

function getReadProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

// ── SWR fetcher ──────────────────────────────────────────────────────────────

const fetchContractState = async (
  address: string | null,
  userAddress: string | null
): Promise<ContractState> => {
  if (!address) throw new Error("No contract address configured.");

  const readProvider = getReadProvider();
  if (!readProvider) throw new Error("No Ethereum provider found.");

  const contract = new ethers.Contract(address, LOTTERY_ABI, readProvider);

  const [phase, prizePool, participantCount, winner, owner, ticketPrice] =
    await Promise.all([
      contract.phase(),
      contract.prizePool(),
      contract.participantCount(),
      contract.winner(),
      contract.owner(),
      contract.ticketPrice(),
    ]);

  let hasTicket = false;
  if (userAddress) {
    hasTicket = await contract.hasTicket(userAddress);
  }

  return {
    phase: Number(phase),
    prizePool: BigInt(prizePool),
    participantCount: BigInt(participantCount),
    winner: winner as string,
    owner: owner as string,
    ticketPrice: BigInt(ticketPrice),
    hasTicket,
  };
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useContract(wallet: WalletState): UseContractReturn {
  const swrKey = CONTRACT_ADDRESS
    ? ["lotteryState", CONTRACT_ADDRESS, wallet.address]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, addr, userAddr]) => fetchContractState(addr, userAddr),
    {
      refreshInterval: 15_000, // auto-refresh every 15s
      revalidateOnFocus: true,
    }
  );

  /** Helper: get a write contract instance */
  const getWriteContract = useCallback(() => {
    if (!wallet.signer) throw new Error("Wallet not connected.");
    if (!wallet.isCorrectNetwork) throw new Error("Wrong network.");
    return new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, wallet.signer);
  }, [wallet.signer, wallet.isCorrectNetwork]);

  /** Generic tx wrapper: send tx, wait for confirmation, return hash */
  const sendTx = useCallback(
    async (
      fn: () => Promise<ethers.ContractTransactionResponse>
    ): Promise<TxResult> => {
      try {
        const tx = await fn();
        await tx.wait(1);
        // Refresh contract state after confirmation
        mutate();
        return { hash: tx.hash };
      } catch (err) {
        throw new Error(parseContractError(err));
      }
    },
    [mutate]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const buyTicket = useCallback(
    (valueEth: string) =>
      sendTx(() => {
        const c = getWriteContract();
        return c.buyTicket({ value: ethers.parseEther(valueEth) });
      }),
    [sendTx, getWriteContract]
  );

  const closeSale = useCallback(
    () =>
      sendTx(() => {
        const c = getWriteContract();
        return c.closeSale();
      }),
    [sendTx, getWriteContract]
  );

  const commitHash = useCallback(
    (secret: string) =>
      sendTx(() => {
        const c = getWriteContract();
        const hash = buildCommitHash(secret);
        return c.commitHash(hash);
      }),
    [sendTx, getWriteContract]
  );

  const revealAndDraw = useCallback(
    (secret: string) =>
      sendTx(() => {
        const c = getWriteContract();
        const secretBytes = encodeSecret(secret);
        return c.revealAndDraw(secretBytes);
      }),
    [sendTx, getWriteContract]
  );

  const claimPrize = useCallback(
    () =>
      sendTx(() => {
        const c = getWriteContract();
        return c.claimPrize();
      }),
    [sendTx, getWriteContract]
  );

  const refreshState = useCallback(() => mutate(), [mutate]);

  return useMemo(
    () => ({
      contractState: data,
      isLoading,
      error: error as Error | undefined,
      refreshState,
      buyTicket,
      closeSale,
      commitHash,
      revealAndDraw,
      claimPrize,
    }),
    [
      data,
      isLoading,
      error,
      refreshState,
      buyTicket,
      closeSale,
      commitHash,
      revealAndDraw,
      claimPrize,
    ]
  );
}
