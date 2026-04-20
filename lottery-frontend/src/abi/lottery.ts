/**
 * ABI for the Lottery contract with Commit-Reveal randomness.
 * Functions: buyTicket, commitHash, revealAndDraw, claimPrize, closeSale
 * Phases: Open(0), SaleClosed(1), Committed(2), Drawn(3)
 */
export const LOTTERY_ABI = [
  // ── View / Pure ──────────────────────────────────────────────────────────────
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "phase",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "prizePool",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "participantCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "winner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "ticketPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hasTicket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "participant", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // ── State-Changing ────────────────────────────────────────────────────────────
  {
    name: "buyTicket",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
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
    stateMutability: "nonpayable",
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
    name: "claimPrize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ── Events ───────────────────────────────────────────────────────────────────
  {
    name: "TicketPurchased",
    type: "event",
    inputs: [{ name: "buyer", type: "address", indexed: true }],
  },
  {
    name: "WinnerDrawn",
    type: "event",
    inputs: [{ name: "winner", type: "address", indexed: true }],
  },
  {
    name: "PrizeClaimed",
    type: "event",
    inputs: [
      { name: "winner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export type LotteryABI = typeof LOTTERY_ABI;
