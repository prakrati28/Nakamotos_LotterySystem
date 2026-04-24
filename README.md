# Project [4] - Nakamoto's Lottery System

On-chain commit-reveal lottery with a Next.js frontend, Foundry contracts, and owner workflows for managing rounds.

## Team Members

| No. | Name            | Roll Number |
| 1   | Alaya Dcruz     | 240001007   |
| 2   | Anushka Krishan | 240001012   |
| 3   | Prakrati Pawar  | 240001053   |
| 4   | Vanshika Gupta  | 240001076   |
| 5   | Kartikey Raghav | 240021008   |
| 6   | Trijal Mathuria | 240001073   |

## Overview

Nakamoto's Lottery System is a commit-reveal on-chain lottery with a Next.js frontend, Foundry smart contracts, and a backend/API layer for owner actions and round management.

## Project Snapshot

| Item            | Details               |
| Project         | Project 4             |
| Contract Model  | Commit-reveal lottery |
| Frontend        | Next.js               |
| Smart Contracts | Solidity + Foundry    |
| Chain Target    | Sepolia               |

## Features

- Buy lottery tickets directly from the web UI.
- Track the current round, prize pool, and ticket counts.
- Close sale, commit hash, reveal, and draw winner through owner actions.
- Claim prize or refund depending on the round outcome.
- Persist round and action state through Prisma-backed APIs.

## Prerequisites

- Node.js 18+ or 20+
- npm
- Foundry (`forge`, `cast`, `anvil`)
- MetaMask
- Sepolia ETH for testing
- A Sepolia RPC endpoint

## Setup

### 1. Open the repository

Open the `Nakamotos_LotterySystem` folder in VS Code.

### 2. Install dependencies

Frontend:

```bash
cd lottery-frontend
npm install
```

Contracts:

```bash
forge install
```

### 3. Configure environment variables

<!-- TODO: add environment variable instructions here -->
<!-- TODO: list required frontend, server, and database variables -->


### 4. Compile

```bash
forge build
```

If you want to compile the frontend TypeScript app as well:

```bash
cd lottery-frontend
npm run build
```

### 5. Test

Contract tests:

```bash
forge test
```

If you want the specific test file used in this repo:

```bash
forge test --match-path test/lotterytest.t.sol -vvv
```

Frontend checks:

```bash
cd lottery-frontend
npm run dev
```

### 6. Deploy

<!-- TODO: add deployment command here -->
<!-- TODO: mention whether deployment is via Foundry or Hardhat and which network -->




## How to Verify the Website

<!-- TODO: add end-to-end website verification steps here -->
<!-- TODO: include wallet connection, buy ticket, and owner dashboard checks -->



## Gas Optimisation

<!-- TODO: describe the optimized function here -->
<!-- TODO: add before/after gas numbers and why the change is efficient -->



## Known Issues / Limitations

<!-- TODO: list any known issues or limitations here -->



