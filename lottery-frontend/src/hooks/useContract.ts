"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { LOTTERY_ABI } from "@/abi/lottery";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { parseContractError, buildCommitHash, encodeSecret } from "@/lib/utils";
import type { WalletState } from "./useWallet";

export interface ContractState {
  phase:            number;
  prizePool:        bigint;
  participantCount: bigint;
  winner:           string;
  owner:            string;
  ticketPrice:      bigint;
  hasTicket:        boolean;
}

export interface TxResult { hash: string }

export interface UseContractReturn {
  contractState: ContractState | undefined;
  isLoading:     boolean;
  error:         Error | undefined;
  refreshState:  () => void;
  buyTicket:     (valueEth: string) => Promise<TxResult>;
  closeSale:     () => Promise<TxResult>;
  commitHash:    (secret: string) => Promise<TxResult>;
  revealAndDraw: (secret: string) => Promise<TxResult>;
  claimPrize:    () => Promise<TxResult>;
}

async function fetchContractState(
  contractAddress: string,
  userAddress: string | null
): Promise<ContractState> {
  if (!contractAddress) throw new Error("Contract address not configured.");
  if (!window.ethereum)  throw new Error("No Ethereum provider found.");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, LOTTERY_ABI, provider);

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
    phase:            Number(phase),
    prizePool:        BigInt(prizePool),
    participantCount: BigInt(participantCount),
    winner:           winner as string,
    owner:            owner  as string,
    ticketPrice:      BigInt(ticketPrice),
    hasTicket,
  };
}

export function useContract(wallet: WalletState): UseContractReturn {
  const swrKey = CONTRACT_ADDRESS
    ? ["lottery", CONTRACT_ADDRESS, wallet.address]
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, addr, user]) => fetchContractState(addr, user),
    { refreshInterval: 15_000, revalidateOnFocus: true }
  );

  const getWriteContract = useCallback(() => {
    if (!wallet.signer)           throw new Error("Wallet not connected.");
    if (!wallet.isCorrectNetwork) throw new Error("Wrong network selected.");
    return new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, wallet.signer);
  }, [wallet.signer, wallet.isCorrectNetwork]);

  const sendTx = useCallback(
    async (fn: () => Promise<ethers.ContractTransactionResponse>): Promise<TxResult> => {
      try {
        const tx = await fn();
        await tx.wait(1);
        mutate();
        return { hash: tx.hash };
      } catch (err) {
        throw new Error(parseContractError(err));
      }
    },
    [mutate]
  );

  const buyTicket = useCallback(
    (valueEth: string) =>
      sendTx(() => getWriteContract().buyTicket({ value: ethers.parseEther(valueEth) })),
    [sendTx, getWriteContract]
  );

  const closeSale = useCallback(
    () => sendTx(() => getWriteContract().closeSale()),
    [sendTx, getWriteContract]
  );

  const commitHash = useCallback(
    (secret: string) =>
      sendTx(() => getWriteContract().commitHash(buildCommitHash(secret))),
    [sendTx, getWriteContract]
  );

  const revealAndDraw = useCallback(
    (secret: string) =>
      sendTx(() => getWriteContract().revealAndDraw(encodeSecret(secret))),
    [sendTx, getWriteContract]
  );

  const claimPrize = useCallback(
    () => sendTx(() => getWriteContract().claimPrize()),
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
    [data, isLoading, error, refreshState, buyTicket, closeSale, commitHash, revealAndDraw, claimPrize]
  );
}
