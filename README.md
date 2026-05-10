# Nakamoto's Lottery System

> On-chain commit-reveal lottery with a Next.js frontend and backend, Foundry smart contracts, and owner workflows for managing rounds.

---

## Team Members

| No. | Name            | Roll Number |
| --- | --------------- | ----------- |
| 1   | Alaya Dcruz     | 240001007   |
| 2   | Anushka Krishan | 240001012   |
| 3   | Prakrati Pawar  | 240001053   |
| 4   | Vanshika Gupta  | 240001076   |
| 5   | Kartikey Raghav | 240021008   |
| 6   | Trijal Mathuria | 240001073   |

---

## Overview

Nakamoto's Lottery System is a multi-round, commit-reveal on-chain lottery deployed on the Ethereum Sepolia testnet. The owner commits a hashed secret, locks collateral equal to the prize pool, an[...]

A **Chainlink VRF v2.5** variant (`vrf/LotteryVRFChainlink.sol`) replaces the commit-reveal flow with verifiable on-chain randomness.

---

## Project Snapshot

| Item            | Details                                |
| --------------- | -------------------------------------- |
| Project         | Project 4                              |
| Contract Model  | Commit-Reveal Lottery (+ VRF variant)  |
| Frontend        | Next.js 14 (App Router)                |
| Backend         | Next.js API Routes + Prisma ORM        |
| Smart Contracts | Solidity 0.8.20 · Foundry (forge/cast) |
| Chain Target    | Ethereum Sepolia                       |
| Security        | OpenZeppelin Ownable + ReentrancyGuard |
| Static Analysis | Slither                                |

---

## Features

- **Buy lottery tickets** directly from the web UI with MetaMask.
- **Track** the current round, prize pool, ticket count, and phase in real time.
- **Owner dashboard** — close sale, commit hash, reveal & draw winner.
- **Claim prize** — the winner withdraws the entire prize pool.
- **Claim refund** — if the owner is slashed, participants get proportional refunds (ticket cost + share of owner's collateral).
- **Multi-round** — finished rounds are archived; a new round can be started immediately.
- **Chainlink VRF variant** for tamper-proof on-chain randomness.
- **Prisma-backed APIs** persist round and action state for the backend.

---

## Repository Structure

```
Nakamotos_LotterySystem/
├── src/
│   ├── lottery.sol                  # Main commit-reveal lottery contract
│   └── gasOptimisedLottery.sol      # Gas-optimised variant (unchecked + caching)
├── vrf/
│   └── LotteryVRFChainlink.sol      # Chainlink VRF v2.5 variant
├── test/
│   ├── lotterytest.t.sol            # 52-test Foundry test suite
│   ├── coverage_report.txt          # 100% line/statement/function coverage
│   └── gas_report.txt               # Forge gas report + optimisation analysis
├── script/
│   └── Deploy.s.sol                 # Foundry deployment script
├── lottery-frontend/                # Next.js 14 frontend (App Router) and backend (API Routes)
│   ├── src/
│   │   ├── app/                     # Pages and API routes
│   │   ├── components/              # React components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities and contract config
│   │   └── abi/                     # Contract ABI JSON
│   └── prisma/
│       └── schema.prisma            # Prisma schema for round state
├── reports/                         # Analysis and audit reports
│   └── project_report.pdf           # Fairness analysis report
│   └── analysis_report.pdf          # Fairness analysis report
├── slither-reports/                 # Slither static analysis output
├── broadcast/                       # Foundry broadcast artifacts
├── foundry.toml                     # Foundry configuration
├── remappings.txt                   # Solidity import remappings
└── README.md
```



## Prerequisites

| Tool            | Version   | Purpose                        |
| --------------- | --------- | ------------------------------ |
| **Node.js**     | 18+ / 20+ | Frontend & backend runtime     |
| **npm**         | 9+        | Package manager                |
| **Foundry**     | Latest    | `forge`, `cast`, `anvil`       |
| **MetaMask**    | Latest    | Browser wallet for Sepolia     |
| **Sepolia ETH** | —         | Testnet gas for transactions   |
| **Sepolia RPC** | —         | e.g. Alchemy / Infura endpoint |

Install Foundry (if not already):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

---

## Setup

### 1. Clone the Repository

```bash
git clone --recurse-submodules https://github.com/prakrati28/Nakamotos_LotterySystem.git
cd Nakamotos_LotterySystem
```

> If you already cloned without `--recurse-submodules`, run:
>
> ```bash
> git submodule update --init --recursive
> ```

### 2. Install Dependencies

**Smart contracts (Foundry submodules):**

```bash
forge install
```

**Web App:**

```bash
cd lottery-frontend
npm install
```

### 3. Configure Environment Variables

#### Frontend (`lottery-frontend/.env`)

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=Sepolia
NEXT_PUBLIC_ETHERSCAN_BASE_URL=https://sepolia.etherscan.io
NEXT_PUBLIC_TICKET_PRICE_ETH=0.00000001
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
OWNER_PRIVATE_KEY=0xYourPrivateKey
OWNER_API_KEY=some-long-random-secret-string
DATABASE_URL=postgresql://user:password@localhost:5432/lottochain
DEFAULT_COLLATERAL_ETH=0.1
```

#### Foundry (shell environment or `.env` at project root)

```env
OWNER_PRIVATE_KEY=<owner-wallet-private-key>
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_API_KEY>
```

### 4. Set Up the Database (Prisma)

**Web App:**

```bash
cd lottery-frontend
npx prisma generate
npx prisma db push
```

---

## Compile

**Smart contracts:**

```bash
forge build
```

**Web App (TypeScript):**

```bash
cd lottery-frontend
npm run build
```

---

## Test

**Run all 52 contract tests:**

```bash
forge test
```

**Run with verbose output on the specific test file:**

```bash
forge test --match-path test/lotterytest.t.sol -vvv
```

**Run tests for the VRF variant:**

```bash
FOUNDRY_PROFILE=vrf forge test --match-path vrf/vrfchainlinkTest.t.sol -vvv
```

**Generate coverage report:**

```bash
forge coverage --match-path test/lotterytest.t.sol
```

**Generate gas report:**

```bash
forge test --match-path test/lotterytest.t.sol --gas-report
```

### Test Results Summary

- **52 tests** — all passing
- **Line coverage:** 100% (80/80)
- **Statement coverage:** 100% (76/76)
- **Branch coverage:** 90.38% (47/52)
- **Function coverage:** 100% (11/11)

---

## Deploy

### Deploy to Sepolia

```bash
forge script script/Deploy.s.sol:DeployLottery \
  --rpc-url $RPC_URL \
  --private-key $OWNER_PRIVATE_KEY \
  --broadcast \
  --verify
```

> **Note:** The deploy script sets the ticket price to `0.00000001 ether` (10 Gwei). To change it, edit the constructor argument in `script/Deploy.s.sol`.

### Deploy to a Local Anvil Node

**Terminal 1 — start Anvil:**

```bash
anvil
```

**Terminal 2 — deploy:**

```bash
forge script script/Deploy.s.sol:DeployLottery \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

---

## Run the Application

### Web App (Next.js)

```bash
cd lottery-frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Verify the Website

1. **Connect MetaMask** — switch to the Sepolia testnet and connect your wallet on the frontend.
2. **Buy a ticket** — click "Buy Ticket" and confirm the transaction in MetaMask. The ticket count and prize pool should update.
3. **Owner dashboard** (owner wallet only):
   - **Close Sale** — stops ticket purchases for the current round.
   - **Commit Hash** — submit `keccak256(secret)` and deposit collateral equal to the prize pool.
   - **Reveal & Draw** — reveal the secret after 10 blocks to draw a winner.
4. **Claim prize** — the drawn winner clicks "Claim Prize" to withdraw the entire prize pool.
5. **Slash owner** — if the owner fails to reveal within 250 blocks, any user can trigger `slashOwner()` and then claim a proportional refund.
6. **Start new round** — the owner starts the next round once the current one finishes.

---

## Gas Optimisation

The `revealAndDraw` function was identified as the most computationally expensive function and was specifically targeted for optimisation.

### Before vs After

| Metric | `lottery.sol` (Before) | `gasOptimisedLottery.sol` (After) | Savings |
| ------ | ---------------------- | --------------------------------- | ------- |
| Min    | 24,517                 | 24,517                            | 0       |
| Avg    | 44,121                 | 44,031                            | **90**  |
| Median | 53,788                 | 53,635                            | **153** |
| Max    | 53,788                 | 53,635                            | **153** |

### Techniques Applied

1. **`unchecked` block on modulo** — The Solidity 0.8+ compiler injects a zero-divisor check before every `%` operation. Since `totalParticipants > 0` is already guaranteed by the `closeSale()`[...]

2. **Explicit memory caching** — State variables (`targetBlock`, `winner`, `prizePool`) are read from storage once into local stack variables, avoiding repeat warm SLOADs (100 gas each) and pre[...]

---

---

## Owner Slashing Fairness Analysis

The **`reports/analysis_report.md`** provides a comprehensive analysis of the owner slashing mechanism to verify whether the owner is slashed fairly or unfairly. This report examines:

- **Edge cases** — boundary conditions and potential attack vectors
- **Fairness guarantees** — formal analysis ensuring no participant receives more or less than their rightful share

This document serves as an audit trail for the slashing logic and can be used to verify the system's integrity and fairness properties.

---

## Static Analysis (Slither)

Slither reports are available in the `slither-reports/` directory:

```bash
# Run slither (requires slither-analyzer installed)
slither src/lottery.sol
slither src/gasOptimisedLottery.sol
slither vrf/LotteryVRFChainlink.sol
```

---

## Limitations

- **Single-winner model** — Each round produces exactly one winner who receives the entire prize pool. No partial or multi-winner distribution.
- **No on-chain ticket cap** — There is no enforced maximum number of tickets per round; the owner must manage round sizes off-chain.

---

## License

MIT — see [`SPDX-License-Identifier`](https://spdx.org/licenses/MIT.html) headers in each `.sol` file.
