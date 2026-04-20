import { ethers } from "ethers";
import { ETHERSCAN_BASE } from "./constants";

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-3)}`;
}

export function formatEth(wei: bigint, decimals = 4): string {
  const n = parseFloat(ethers.formatEther(wei));
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/**
 * Build the commit hash from a secret string.
 * keccak256(encodeBytes32String(secret)) — must match your Solidity contract.
 * If your contract uses a different encoding, adjust here.
 */
export function buildCommitHash(secret: string): string {
  const bytes32 = ethers.encodeBytes32String(secret.slice(0, 31));
  return ethers.keccak256(bytes32);
}

export function encodeSecret(secret: string): string {
  return ethers.encodeBytes32String(secret.slice(0, 31));
}

export const etherscanTx   = (h: string) => `${ETHERSCAN_BASE}/tx/${h}`;
export const etherscanAddr = (a: string) => `${ETHERSCAN_BASE}/address/${a}`;

export function parseContractError(err: unknown): string {
  if (!err || typeof err !== "object") return "Unknown error.";
  const e = err as Record<string, unknown>;

  // User rejected
  if (e.code === 4001 || e.code === "ACTION_REJECTED")
    return "Transaction rejected.";

  // Ethers reason string
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

export function cls(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
