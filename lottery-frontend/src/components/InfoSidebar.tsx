"use client";

import { BookOpen, ExternalLink, FileCode } from "lucide-react";
import type { RoundState } from "@/hooks/useContract";
import { CONTRACT_ADDRESS, CHAIN_NAME, ETHERSCAN_BASE } from "@/lib/constants";
import { shortAddress } from "@/lib/utils";

interface InfoSidebarProps {
  roundState: RoundState | undefined;
}

const steps = [
  {
    n: "01",
    title: "Open Phase",
    desc: "Participants buy tickets by sending ETH.",
  },
  {
    n: "02",
    title: "Close Sale",
    desc: "Owner stops ticket sales via the dashboard.",
  },
  {
    n: "03",
    title: "Commit Hash",
    desc: "Owner posts keccak256(secret) on-chain with a collateral bond.",
  },
  {
    n: "04",
    title: "Reveal & Draw",
    desc: "After targetBlock, owner reveals the secret. Contract picks the winner.",
  },
  {
    n: "05",
    title: "Claim Prize",
    desc: "Winner calls claimPrize(roundId) to withdraw the pool.",
  },
];

export default function InfoSidebar({ roundState }: InfoSidebarProps) {
  return (
    <aside className="space-y-4">
      {/* How It Works */}
      <div className="animate-slide-up-d1 rounded-2xl border border-lborder bg-lsurface shadow-lcard">
        <div className="flex items-center gap-3 border-b border-lborder px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-laccent/12 ring-1 ring-laccent/20">
            <BookOpen className="h-4 w-4 text-laccent" />
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-ltext">
            How It Works
          </h3>
        </div>
        <ol className="divide-y divide-lborder">
          {steps.map(({ n, title, desc }) => (
            <li key={n} className="flex gap-4 px-5 py-4">
              <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-laccent/60">
                {n}
              </span>
              <div>
                <p className="mb-1 text-sm font-semibold text-ltext">{title}</p>
                <p className="text-sm leading-relaxed text-ldim">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Contract Info */}
      <div className="animate-slide-up-d2 rounded-2xl border border-lborder bg-lsurface shadow-lcard">
        <div className="flex items-center gap-3 border-b border-lborder px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-laccent/12 ring-1 ring-laccent/20">
            <FileCode className="h-4 w-4 text-laccent" />
          </div>
          <h3 className="font-display text-base font-semibold tracking-tight text-ltext">
            Contract
          </h3>
        </div>
        <div className="space-y-3.5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ldim">
              Network
            </span>
            <span className="rounded-lg bg-lghost px-2.5 py-1 font-mono text-xs text-lsubtle ring-1 ring-lborder">
              {CHAIN_NAME}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ldim">
              Address
            </span>
            {CONTRACT_ADDRESS ? (
              <a
                href={`${ETHERSCAN_BASE}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-laccent hover:text-laccenthi"
              >
                {shortAddress(CONTRACT_ADDRESS)}{" "}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-mono text-xs text-ldim">Not set</span>
            )}
          </div>
          {roundState && (
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ldim">
                Round
              </span>
              <span className="font-mono text-xs text-lsubtle">
                #{roundState.roundId}
              </span>
            </div>
          )}
          <div className="divider pt-1" />
          {CONTRACT_ADDRESS && (
            <a
              href={`${ETHERSCAN_BASE}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-lborder py-2.5 text-sm font-medium text-lsubtle transition-all hover:border-lborderhi hover:text-ltext"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on Etherscan
            </a>
          )}
        </div>
      </div>

      {/* Security note */}
      <div className="animate-slide-up-d3 rounded-xl border border-lborder bg-lcard px-5 py-4">
        <p className="text-sm leading-relaxed text-ldim">
          <span className="font-semibold text-lsubtle">Commit-reveal</span>{" "}
          prevents the owner from choosing a winner after seeing all
          participants. The secret is binding once committed — a different value
          will cause the contract to revert. If the owner fails to reveal within
          250 blocks, anyone can slash them and participants get a full refund.
        </p>
      </div>
    </aside>
  );
}
