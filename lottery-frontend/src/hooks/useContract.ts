import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { LOTTERY_ABI } from "@/abi/lottery";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { parseContractError } from "@/lib/utils";
import type { WalletState } from "./useWallet";

export interface RoundState {
  roundId: number;
  phase: string;
  prizePool: string;
  prizePoolWei: string;
  totalTickets: number;
  winner: string;
  ticketPrice: string;
  ticketPriceWei: string;
  targetBlock: number;
  currentBlock: number;
  blocksUntilReveal: number;
  revealWindowExpiry: number;
  isRevealWindowOpen: boolean;
  prizeClaimed: boolean;
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

async function fetchCurrentRoundState(): Promise<
  RoundState & { _roundId: number }
> {
  if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured.");

  const roundRes = await fetch("/api/rounds/current", { cache: "no-store" });
  if (!roundRes.ok) {
    const err = await roundRes.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${roundRes.status}`);
  }
  const { currentRound } = (await roundRes.json()) as { currentRound: number };

  const stateRes = await fetch(`/api/rounds/${currentRound}`, {
    cache: "no-store",
  });
  if (!stateRes.ok) {
    const err = await stateRes.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${stateRes.status}`);
  }
  const data = (await stateRes.json()) as RoundState;
  return { ...data, _roundId: currentRound, userTickets: 0 };
}

export function useContract(wallet: WalletState): UseContractReturn {
  const swrKey = CONTRACT_ADDRESS
    ? ["contractState", wallet.address ?? "anon"]
    : null;

  const {
    data: rawState,
    error,
    isLoading,
    mutate,
  } = useSWR(swrKey, fetchCurrentRoundState, {
    refreshInterval: 12_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const lastAugmentedKey = useRef<string>("");

  useEffect(() => {
    if (!rawState || !wallet.address || !window.ethereum) return;

    const key = `${rawState._roundId}-${wallet.address}`;
    if (lastAugmentedKey.current === key) return;
    lastAugmentedKey.current = key;

    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          LOTTERY_ABI,
          provider,
        );
        const tickets = await contract.userTickets(
          BigInt(rawState._roundId),
          wallet.address,
        );
        mutate(
          (prev) => (prev ? { ...prev, userTickets: Number(tickets) } : prev),
          false,
        );
      } catch {}
    })();
  }, [rawState?._roundId, wallet.address, mutate]);

  const roundState: RoundState | undefined = rawState
    ? {
        roundId: rawState.roundId,
        phase: rawState.phase,
        prizePool: rawState.prizePool,
        prizePoolWei: rawState.prizePoolWei,
        totalTickets: rawState.totalTickets,
        winner: rawState.winner,
        ticketPrice: rawState.ticketPrice,
        ticketPriceWei: rawState.ticketPriceWei,
        targetBlock: rawState.targetBlock,
        currentBlock: rawState.currentBlock,
        blocksUntilReveal: rawState.blocksUntilReveal,
        revealWindowExpiry: rawState.revealWindowExpiry,
        isRevealWindowOpen: rawState.isRevealWindowOpen,
        prizeClaimed: rawState.prizeClaimed,
        userTickets: rawState.userTickets,
      }
    : undefined;

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
      currentRound: rawState?._roundId,
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
      rawState?._roundId,
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
