"use client";

import { useState, useEffect, useCallback } from "react";
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
  switchNetwork: () => Promise<void>;
  isConnecting: boolean;
}

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(
    null
  );
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === TARGET_CHAIN_ID;

  /** Re-hydrate signer whenever provider changes */
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
        setSigner(null);
        setAddress(null);
      }
    },
    []
  );

  /** Connect MetaMask */
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install it first.");
      return;
    }
    setIsConnecting(true);
    try {
      const bp = new ethers.BrowserProvider(window.ethereum);
      await bp.send("eth_requestAccounts", []);
      setProvider(bp);
      await refreshSigner(bp);
    } catch (err: unknown) {
      console.error("Connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshSigner]);

  /** Disconnect (clears state — MetaMask doesn't expose a true revoke API) */
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
  }, []);

  /** Ask MetaMask to switch to the target network */
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
      });
    } catch (err: unknown) {
      console.error(`Could not switch to ${CHAIN_NAME}:`, err);
    }
  }, []);

  /** Listen for account / chain changes */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (provider) {
        refreshSigner(provider);
      }
    };

    const handleChainChanged = () => {
      // Reload to re-initialise everything cleanly
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // Auto-connect if already authorised
    (async () => {
      if (!window.ethereum) return;
      const bp = new ethers.BrowserProvider(window.ethereum);
      const accounts = (await bp.send("eth_accounts", [])) as string[];
      if (accounts.length > 0) {
        setProvider(bp);
        await refreshSigner(bp);
      }
    })();

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider, disconnect, refreshSigner]);

  return {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    provider,
    signer,
    connect,
    disconnect,
    switchNetwork,
    isConnecting,
  };
}
