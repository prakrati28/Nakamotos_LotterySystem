"use client";

import { Wifi, WifiOff, AlertTriangle, LogOut, Zap } from "lucide-react";
import type { WalletState } from "@/hooks/useWallet";
import { shortAddress, etherscanAddr } from "@/lib/utils";
import { CHAIN_NAME, TARGET_CHAIN_ID } from "@/lib/constants";

interface HeaderProps {
  wallet: WalletState;
}

export default function Header({ wallet }: HeaderProps) {
  const { address, chainId, isConnected, isCorrectNetwork, connect, disconnect, switchNetwork, isConnecting } = wallet;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <Zap className="h-5 w-5 text-bg" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-display text-2xl tracking-wider text-text">
              LOTTO<span className="text-accent">CHAIN</span>
            </span>
          </div>
        </div>

        {/* Right: network + wallet */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          {isConnected && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                isCorrectNetwork
                  ? "bg-success/10 text-success"
                  : "bg-warn/10 text-warn cursor-pointer hover:bg-warn/20"
              }`}
              onClick={!isCorrectNetwork ? switchNetwork : undefined}
              title={!isCorrectNetwork ? `Click to switch to ${CHAIN_NAME}` : ""}
            >
              {isCorrectNetwork ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3 animate-pulse" />
              )}
              {isCorrectNetwork
                ? CHAIN_NAME
                : `Switch to ${CHAIN_NAME}`}
            </div>
          )}

          {/* Wallet button */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <a
                href={etherscanAddr(address!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-mono text-subtle transition-colors hover:border-accent/40 hover:text-text"
              >
                <div className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
                {shortAddress(address!)}
              </a>
              <button
                onClick={disconnect}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-warn/60 hover:text-warn"
                title="Disconnect"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="group flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-accentDim active:scale-95 disabled:opacity-60"
            >
              {isConnecting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg/40 border-t-bg" />
              ) : (
                <WifiOff className="h-4 w-4 group-hover:hidden" />
              )}
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Wrong network banner */}
      {isConnected && !isCorrectNetwork && (
        <div className="border-t border-warn/30 bg-warn/10 px-6 py-2.5 text-center text-sm text-warn">
          ⚠️ You are on chain ID <strong>{chainId}</strong>. Please{" "}
          <button
            onClick={switchNetwork}
            className="font-semibold underline underline-offset-2 hover:text-orange-300"
          >
            switch to {CHAIN_NAME} (chain {TARGET_CHAIN_ID})
          </button>{" "}
          to interact with the lottery.
        </div>
      )}
    </header>
  );
}
