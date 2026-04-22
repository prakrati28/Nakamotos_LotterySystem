import { ethers } from "ethers";
import { hash, randomBytes } from "crypto";
// to generate a cryptographically random secret of 32 bytes
function generateSecret() {
    const bytes = randomBytes(32);
    return "0x" + bytes.toString("hex");
}
// to compute keccak256(abi.encodePacked(secret))  which will be verified by the revealAndDraw function in lottery contract
function hashSecret(secret) {
    return ethers.solidityPackedKeccak256(["bytes32"], [secret]);
}
// to verify keccak256 hash matches hash stored in the db
function verifyHash(secret, expectedHash) {
    return hashSecret(secret).toLowerCase() === expectedHash.toLowerCase();
}
export { generateSecret, hashSecret, verifyHash };
//# sourceMappingURL=crypto.js.map