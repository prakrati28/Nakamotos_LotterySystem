export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const TARGET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111",
  10
);

export const CHAIN_NAME =
  process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Sepolia";

export const ETHERSCAN_BASE =
  process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL ??
  "https://sepolia.etherscan.io";

export const TICKET_PRICE_ETH =
  process.env.NEXT_PUBLIC_TICKET_PRICE_ETH ?? "0.01";

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

/** Human-readable phase labels */
export const PHASE_LABELS: Record<number, string> = {
  0: "Open",
  1: "Sale Closed",
  2: "Committed",
  3: "Drawn",
};

/** Tailwind classes — uses standard palette (no custom tokens) for phase badge */
export const PHASE_BADGE_STYLES: Record<number, { dot: string; badge: string }> = {
  0: { dot: "bg-emerald-400", badge: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" },
  1: { dot: "bg-orange-400",  badge: "bg-orange-400/10 text-orange-400 ring-orange-400/20"   },
  2: { dot: "bg-yellow-400",  badge: "bg-yellow-400/10 text-yellow-400 ring-yellow-400/20"   },
  3: { dot: "bg-blue-400",    badge: "bg-blue-400/10 text-blue-400 ring-blue-400/20"         },
};
