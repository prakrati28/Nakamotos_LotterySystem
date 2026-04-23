"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { TARGET_CHAIN_ID, CHAIN_NAME } from "@/lib/constants";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchAccount: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  isConnecting: boolean;
  isSwitchingAccount: boolean;
}

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void,
      ) => void;
      request?: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const manuallyDisconnected = useRef(false);

  const providerRef = useRef<ethers.BrowserProvider | null>(null);
  providerRef.current = provider;

  const isConnected = !!address;
  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  const clearWalletState = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
  }, []);

  const refreshSigner = useCallback(
    async (bp: ethers.BrowserProvider) => {
      try {
        const s = await bp.getSigner();
        const a = await s.getAddress();
        const network = await bp.getNetwork();
        setSigner(s);
        setAddress(a);
        setChainId(Number(network.chainId));
      } catch {
        clearWalletState();
      }
    },
    [clearWalletState],
  );

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install the MetaMask extension.");
      return;
    }
    manuallyDisconnected.current = false;
    setIsConnecting(true);
    try {
      const bp = new ethers.BrowserProvider(window.ethereum);
      await bp.send("eth_requestAccounts", []);
      setProvider(bp);
      await refreshSigner(bp);
    } catch (err) {
      console.error("Wallet connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshSigner]);

  const disconnect = useCallback(() => {
    manuallyDisconnected.current = true;
    clearWalletState();
  }, [clearWalletState]);

  const switchAccount = useCallback(async () => {
    if (!window.ethereum) return;
    setIsSwitchingAccount(true);
    manuallyDisconnected.current = false;
    try {
      await window.ethereum.request?.({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const bp = new ethers.BrowserProvider(window.ethereum);
      const accs = (await bp.send("eth_accounts", [])) as string[];
      if (accs.length > 0) {
        setProvider(bp);
        await refreshSigner(bp);
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code !== 4001) console.error("switchAccount error:", err);
    } finally {
      setIsSwitchingAccount(false);
    }
  }, [refreshSigner]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      console.error(`Network switch failed (${CHAIN_NAME}):`, err);
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        clearWalletState();
      } else if (!manuallyDisconnected.current && providerRef.current) {
        refreshSigner(providerRef.current);
      }
    };

    const onChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    (async () => {
      if (!window.ethereum || manuallyDisconnected.current) return;
      try {
        const bp = new ethers.BrowserProvider(window.ethereum);
        const accs = (await bp.send("eth_accounts", [])) as string[];
        if (accs.length > 0) {
          setProvider(bp);
          await refreshSigner(bp);
        }
      } catch {}
    })();

    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  return {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    provider,
    signer,
    connect,
    disconnect,
    switchAccount,
    switchNetwork,
    isConnecting,
    isSwitchingAccount,
  };
}
