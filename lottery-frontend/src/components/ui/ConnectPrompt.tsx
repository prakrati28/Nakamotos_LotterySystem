"use client";

import { ArrowLeftRight, ArrowRight, Wallet } from "lucide-react";
import type { WalletState } from "@/hooks/useWallet";

interface ConnectPromptProps {
  wallet: WalletState;
}

export default function ConnectPrompt({ wallet }: ConnectPromptProps) {
  const { connect, switchAccount, isConnecting, isSwitchingAccount } = wallet;

  return (
    <div className="animate-slide-up-d1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-lborder bg-lsurface px-8 py-14 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-lborder bg-lcard shadow-lcard">
        <Wallet className="h-6 w-6 text-lsubtle" />
      </div>

      <h3 className="font-display mb-2 text-lg font-semibold tracking-tight text-ltext">
        Connect your wallet
      </h3>
      <p className="mb-7 max-w-xs text-sm leading-relaxed text-ldim">
        Connect MetaMask to purchase tickets, track your participation, and
        claim prizes.
      </p>

      {/* Primary: Connect (returns last-used account silently) */}
      <button
        onClick={connect}
        disabled={isConnecting || isSwitchingAccount}
        className="group flex items-center gap-2 rounded-lg bg-laccent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:opacity-60"
      >
        {isConnecting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : null}
        {isConnecting ? "Connecting..." : "Connect Wallet"}
        {!isConnecting && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>

      {/* Secondary: force MetaMask account picker */}
      <button
        onClick={switchAccount}
        disabled={isConnecting || isSwitchingAccount}
        className="mt-3 flex items-center gap-2 rounded-lg border border-lborder px-5 py-2.5 text-sm font-medium text-lsubtle transition-all hover:border-lborderhi hover:text-ltext disabled:opacity-60"
      >
        {isSwitchingAccount ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ldim/30 border-t-lsubtle" />
        ) : (
          <ArrowLeftRight className="h-3.5 w-3.5" />
        )}
        {isSwitchingAccount ? "Opening picker..." : "Use a different account"}
      </button>

      <p className="mt-5 text-[11px] text-ldim">
        MetaMask browser extension required
      </p>
    </div>
  );
}
