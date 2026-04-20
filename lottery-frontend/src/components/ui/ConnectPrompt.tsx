"use client";

import { Wallet } from "lucide-react";

interface ConnectPromptProps {
  onConnect: () => Promise<void>;
}

export default function ConnectPrompt({ onConnect }: ConnectPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-8 py-14 text-center animate-slide-up">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface">
        <Wallet className="h-6 w-6 text-muted" />
      </div>
      <h3 className="mb-2 font-display text-lg tracking-wider text-text">
        CONNECT YOUR WALLET
      </h3>
      <p className="mb-6 max-w-xs text-sm text-muted">
        Connect MetaMask to buy tickets, check your status, and claim prizes.
      </p>
      <button
        onClick={onConnect}
        className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-accentDim active:scale-95"
      >
        Connect MetaMask
      </button>
    </div>
  );
}
