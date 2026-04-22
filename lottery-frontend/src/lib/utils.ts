import { ethers } from "ethers";
import { ETHERSCAN_BASE } from "./constants";

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatEth(value: string | bigint, decimals = 4): string {
  const n =
    typeof value === "bigint"
      ? parseFloat(ethers.formatEther(value))
      : parseFloat(value);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export const etherscanTx = (h: string) => `${ETHERSCAN_BASE}/tx/${h}`;
export const etherscanAddr = (a: string) => `${ETHERSCAN_BASE}/address/${a}`;

export function parseContractError(err: unknown): string {
  if (!err || typeof err !== "object") return "Unknown error.";
  const e = err as Record<string, unknown>;
  if (e.code === 4001 || e.code === "ACTION_REJECTED")
    return "Transaction rejected.";
  if (typeof e.reason === "string") return e.reason;
  if (typeof e.message === "string") {
    const msg = e.message as string;
    const m1 = msg.match(/reverted with reason string '(.+?)'/);
    if (m1) return m1[1];
    const m2 = msg.match(/execution reverted: (.+)/i);
    if (m2) return m2[1];
    return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
  }
  return "Transaction failed.";
}

/** Format a block countdown nicely */
export function formatBlockCountdown(blocks: number): string {
  if (blocks <= 0) return "Now";
  // ~12s per block on mainnet / Sepolia
  const seconds = blocks * 12;
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}m`;
  return `~${(seconds / 3600).toFixed(1)}h`;
}

export function cls(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
