import { ethers } from "ethers";
import { randomBytes } from "crypto";

export function generateSecret(): string {
  const bytes = randomBytes(32);
  return "0x" + bytes.toString("hex");
}

export function hashSecret(secret: string): string {
  return ethers.solidityPackedKeccak256(["bytes32"], [secret]);
}

export function verifyHash(secret: string, expectedHash: string): boolean {
  return hashSecret(secret).toLowerCase() === expectedHash.toLowerCase();
}
