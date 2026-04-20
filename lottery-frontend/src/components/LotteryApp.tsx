"use client";

import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import Header from "./Header";
import LotteryStatus from "./LotteryStatus";
import UserActions from "./UserActions";
import OwnerPanel from "./OwnerPanel";
import ConnectPrompt from "./ui/ConnectPrompt";
import ContractAddressWarning from "./ui/ContractAddressWarning";
import { CONTRACT_ADDRESS } from "@/lib/constants";

export default function LotteryApp() {
  const wallet = useWallet();
  const {
    contractState,
    isLoading,
    error,
    refreshState,
    buyTicket,
    closeSale,
    commitHash,
    revealAndDraw,
    claimPrize,
  } = useContract(wallet);

  return (
    <div className="min-h-screen">
      <Header wallet={wallet} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Contract address not configured */}
        {!CONTRACT_ADDRESS && <ContractAddressWarning />}

        {/* Page title */}
        <div className="mb-10 animate-fade-in">
          <h1 className="font-display text-5xl tracking-wider text-text md:text-6xl">
            DECENTRALISED
            <br />
            <span className="text-accent">LOTTERY</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-subtle">
            Provably fair draw powered by commit-reveal randomness on Ethereum.
            No trusted third party — the winner is determined by cryptographic
            proof.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-warn/30 bg-warn/10 px-5 py-4 text-sm text-warn animate-fade-in">
            <strong>Error loading contract:</strong> {error.message}
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — status + user actions (spans 2 cols on lg) */}
          <div className="space-y-6 lg:col-span-2">
            <LotteryStatus
              contractState={contractState}
              isLoading={isLoading}
              onRefresh={refreshState}
            />

            {wallet.isConnected ? (
              <UserActions
                wallet={wallet}
                contractState={contractState}
                actions={{ buyTicket, claimPrize }}
              />
            ) : (
              <ConnectPrompt onConnect={wallet.connect} />
            )}
          </div>

          {/* Right column — owner panel (only renders if owner) */}
          <div className="lg:col-span-1">
            <OwnerPanel
              wallet={wallet}
              contractState={contractState}
              actions={{ closeSale, commitHash, revealAndDraw }}
            />

            {/* Info card */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 animate-slide-up">
              <h3 className="mb-3 font-display text-base tracking-wider text-text">
                HOW IT WORKS
              </h3>
              <ol className="space-y-3 text-xs text-muted">
                {[
                  ["1", "Open", "Participants buy tickets with ETH."],
                  ["2", "Close", "Owner closes ticket sales."],
                  ["3", "Commit", "Owner commits keccak256(secret) on-chain."],
                  ["4", "Reveal", "Owner reveals secret; contract draws winner."],
                  ["5", "Claim", "Winner claims the full prize pool."],
                ].map(([num, title, desc]) => (
                  <li key={num} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {num}
                    </span>
                    <span>
                      <span className="font-semibold text-subtle">{title} — </span>
                      {desc}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border py-8 text-center text-xs text-muted">
        <p>
          LottoChain · Commit-Reveal Randomness ·{" "}
          <a
            href="https://docs.soliditylang.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-subtle"
          >
            Solidity Docs
          </a>
        </p>
      </footer>
    </div>
  );
}
