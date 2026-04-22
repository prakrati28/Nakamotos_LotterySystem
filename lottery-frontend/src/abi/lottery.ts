/**
 * Full ABI from Lottery.json (Foundry artifact).
 * Used by both the browser (read-only) and Next.js API routes (server-side writes).
 *
 * Key contract design:
 * - All state is per-round: phase(roundId), prizePool(roundId), winner(roundId)
 * - commitHash() is payable — owner posts collateral bond
 * - revealAndDraw() must be called after targetBlock, before targetBlock+250
 * - If owner misses the window, anyone calls slashOwner() to confiscate collateral
 * - claimPrize(roundId) and claimRefund(roundId) both take a roundId
 */
export const LOTTERY_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_ticketPrice", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  // View
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "currentRound",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ticketPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "phase",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "prizePool",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "winner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "totalTickets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "committedHash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "targetBlock",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lockedCollateral",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "prizeClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "userTickets",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getParticipant",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_roundId", type: "uint256" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  // User writes
  {
    name: "buyTicket",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "claimPrize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_roundId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "slashOwner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Owner writes (called server-side)
  {
    name: "closeSale",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "commitHash",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "_hash", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "revealAndDraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_secret", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "startNewRound",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "transferOwnership",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  // Events
  {
    name: "HashCommitted",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "hash", type: "bytes32", indexed: true },
    ],
  },
  {
    name: "WinnerDrawn",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "prizeAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "SaleClosed",
    type: "event",
    inputs: [{ name: "roundId", type: "uint256", indexed: true }],
  },
  {
    name: "RoundStarted",
    type: "event",
    inputs: [{ name: "roundId", type: "uint256", indexed: true }],
  },
  {
    name: "PrizeClaimed",
    type: "event",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "OwnerSlashed",
    type: "event",
    inputs: [{ name: "roundId", type: "uint256", indexed: true }],
  },
  {
    name: "OwnershipTransferred",
    type: "event",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner", type: "address", indexed: true },
    ],
  },
] as const;

export const PHASE_MAP: Record<number, string> = {
  0: "Open",
  1: "SaleClosed",
  2: "Committed",
  3: "Drawn",
  4: "Slashed",
};
