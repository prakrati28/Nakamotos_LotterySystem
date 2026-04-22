export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const TARGET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111",
  10,
);

export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Sepolia";

export const ETHERSCAN_BASE =
  process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL ?? "https://sepolia.etherscan.io";

export const TICKET_PRICE_ETH =
  process.env.NEXT_PUBLIC_TICKET_PRICE_ETH ?? "0.01";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Phase string values — must match PHASE_MAP in abi/lottery.ts exactly.
 * The contract uses: Open(0) SaleClosed(1) Committed(2) Drawn(3) Slashed(4)
 */
export const PHASE_LABELS: Record<string, string> = {
  Open: "Open",
  SaleClosed: "Sale Closed",
  Committed: "Committed",
  Drawn: "Drawn",
  Slashed: "Slashed",
};

export const PHASE_BADGE_STYLES: Record<
  string,
  { dot: string; badge: string }
> = {
  Open: {
    dot: "bg-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
  },
  SaleClosed: {
    dot: "bg-orange-400",
    badge: "bg-orange-400/10  text-orange-400  ring-orange-400/20",
  },
  Committed: {
    dot: "bg-yellow-400",
    badge: "bg-yellow-400/10  text-yellow-400  ring-yellow-400/20",
  },
  Drawn: {
    dot: "bg-blue-400",
    badge: "bg-blue-400/10    text-blue-400    ring-blue-400/20",
  },
  Slashed: {
    dot: "bg-red-400",
    badge: "bg-red-400/10     text-red-400     ring-red-400/20",
  },
};

/** Steps for the phase progress bar — in order */
export const PHASE_STEPS = [
  "Open",
  "SaleClosed",
  "Committed",
  "Drawn",
] as const;
export const PHASE_STEP_LABELS: Record<string, string> = {
  Open: "Open",
  SaleClosed: "Closed",
  Committed: "Committed",
  Drawn: "Drawn",
};
