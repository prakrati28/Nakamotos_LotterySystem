"use client";

import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import Header from "./Header";
import LotteryStatus from "./LotteryStatus";
import UserActions from "./UserActions";
import InfoSidebar from "./InfoSidebar";
import ConnectPrompt from "./ui/ConnectPrompt";
import ContractAddressWarning from "./ui/ContractAddressWarning";
import { CONTRACT_ADDRESS } from "@/lib/constants";

export default function LotteryApp() {
  const wallet = useWallet();
  const {
    roundState,
    currentRound,
    isLoading,
    error,
    refreshState,
    buyTicket,
    claimPrize,
    claimRefund,
    slashOwner,
  } = useContract(wallet);

  return (
    <div className="flex min-h-screen flex-col">
      <Header wallet={wallet} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {!CONTRACT_ADDRESS && <ContractAddressWarning />}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 animate-fade-in">
            <span className="mt-0.5 shrink-0 text-red-400 text-lg">⚠</span>
            <div>
              <p className="font-semibold text-red-300 text-base">
                Failed to load contract
              </p>
              <p className="mt-0.5 text-sm text-red-400/70">{error.message}</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="mb-12 animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lborder bg-lcard px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-lsubtle">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ethereum · Commit-Reveal Protocol
          </div>
          <h1 className="font-display mb-4 text-5xl font-bold tracking-tight text-ltext md:text-6xl">
            On-Chain{" "}
            <span className="bg-gradient-to-r from-laccent via-blue-300 to-laccenthi bg-clip-text text-transparent">
              Lottery
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-lsubtle">
            A provably fair lottery secured by cryptographic commit-reveal
            randomness. The winner is determined by mathematics, not trust.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <LotteryStatus
              roundState={roundState}
              currentRound={currentRound}
              isLoading={isLoading}
              onRefresh={refreshState}
            />
            {wallet.isConnected ? (
              <UserActions
                wallet={wallet}
                roundState={roundState}
                actions={{ buyTicket, claimPrize, claimRefund, slashOwner }}
              />
            ) : (
              <ConnectPrompt wallet={wallet} />
            )}
          </div>
          <div className="lg:col-span-1">
            <InfoSidebar roundState={roundState} />
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-lborder">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path
                d="M10 1L17 5V15L10 19L3 15V5L10 1Z"
                fill="rgba(79,142,247,0.18)"
                stroke="#4F8EF7"
                strokeWidth="1"
              />
              <path
                d="M10 5L14 7.5V12.5L10 15L6 12.5V7.5L10 5Z"
                fill="#4F8EF7"
                opacity="0.75"
              />
            </svg>
            <span className="font-display text-sm font-semibold text-lsubtle">
              LottoChain Protocol
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm text-ldim">
            <a
              href="/dashboard"
              className="transition-colors hover:text-lsubtle"
            >
              Owner Dashboard
            </a>
            <a
              href="https://github.com/prakrati28/NAKAMOTOS_LotterySystem"
              target="_blank"
              className="transition-colors hover:text-lsubtle"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
