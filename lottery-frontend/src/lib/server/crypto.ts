/**
 * Server-side crypto utilities — mirrors the teammate's crypto.js exactly.
 * Uses ethers.solidityPackedKeccak256(["bytes32"], [secret]) to match
 * the Solidity keccak256(abi.encodePacked(_secret)) in the contract.
 */
import { ethers } from "ethers";
import { randomBytes } from "crypto";

/** Generate a cryptographically random 32-byte hex secret */
export function generateSecret(): string {
  const bytes = randomBytes(32);
  return "0x" + bytes.toString("hex");
}

/**
 * Compute keccak256(abi.encodePacked(secret)) — must match the contract's
 * verification logic inside revealAndDraw().
 */
export function hashSecret(secret: string): string {
  return ethers.solidityPackedKeccak256(["bytes32"], [secret]);
}

/** Verify the stored secret matches the stored hash */
export function verifyHash(secret: string, expectedHash: string): boolean {
  return hashSecret(secret).toLowerCase() === expectedHash.toLowerCase();
}
