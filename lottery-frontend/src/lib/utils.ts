import { ethers } from "ethers";
import { ETHERSCAN_BASE } from "./constants";

/** Shorten an Ethereum address: 0x1234…abcd */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Format wei → ETH string with up to 6 decimals */
export function formatEth(wei: bigint): string {
  return parseFloat(ethers.formatEther(wei)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** Build the client-side commit hash from a plaintext secret.
 *  keccak256(abi.encode(secret_as_bytes32))
 *  The contract must use the same encoding scheme.
 */
export function buildCommitHash(secret: string): string {
  // Pad/encode the secret as bytes32
  const secretBytes = ethers.encodeBytes32String(
    secret.slice(0, 31) // bytes32 max 31 UTF-8 chars + null terminator
  );
  return ethers.keccak256(secretBytes);
}

/** Encode a plaintext secret as bytes32 for revealAndDraw */
export function encodeSecret(secret: string): string {
  return ethers.encodeBytes32String(secret.slice(0, 31));
}

/** Etherscan links */
export const etherscanTx = (hash: string) => `${ETHERSCAN_BASE}/tx/${hash}`;
export const etherscanAddr = (addr: string) =>
  `${ETHERSCAN_BASE}/address/${addr}`;

/** Parse a contract revert error into a human-readable string */
export function parseContractError(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Unknown error";
  const e = error as Record<string, unknown>;

  // User rejected in MetaMask
  if (e.code === 4001 || e.code === "ACTION_REJECTED") {
    return "Transaction rejected by user.";
  }

  // Ethers v6 revert with reason
  if (typeof e.reason === "string") return e.reason;

  // Nested message
  if (typeof e.message === "string") {
    // Strip noisy ethers prefix
    const msg = e.message as string;
    const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) return revertMatch[1];
    const customMatch = msg.match(/execution reverted: (.+)/);
    if (customMatch) return customMatch[1];
    // Shorten very long messages
    return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
  }

  return "Transaction failed.";
}
