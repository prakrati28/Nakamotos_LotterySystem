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

/** Map numeric phase from contract to human-readable label */
export const PHASE_LABELS: Record<number, string> = {
  0: "Open",
  1: "Sale Closed",
  2: "Committed",
  3: "Drawn",
};

export const PHASE_COLORS: Record<number, string> = {
  0: "text-success",
  1: "text-warn",
  2: "text-yellow-400",
  3: "text-accent",
};
