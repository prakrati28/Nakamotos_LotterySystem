import express from "express"
import { ethers } from "ethers"
import { PrismaClient } from "@prisma/client"
import { ownerAuth } from "../middlewares/ownerAuth.js"
import { generateSecret, hashSecret, verifyHash } from "../lib/crypto.js"
import { getContract, getOnChainPhase } from "../lib/contract.js"

const ownerRouter = express.Router();

const prisma = new PrismaClient();

ownerRouter.use(ownerAuth);

async function logUser(roundId, action, txHash) {
  const userData = txHash ? { roundId, action, txHash } : { roundId, action };
  await prisma.userLog.create({ data: userData });
}

// lists all rounds in the DB
ownerRouter.get("/rounds", async (req, res) => {
  const rounds = await prisma.round.findMany({
    orderBy: { id: "desc" },
    include: { userlog: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  res.json(rounds);
});

// get a single round + its logs
ownerRouter.get("/rounds/:roundId", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { userlog: { orderBy: { createdAt: "asc" } } },
  });

  if (!round) {
    res.status(404).json({ error: "Could not find round with specified round ID" });
    return;
  }

  const onChainPhase = await getOnChainPhase(roundId).catch(() => null);
  res.json({ ...round, onChainPhase });
});

// generate + store a secret for this round (call BEFORE commitHash)
ownerRouter.post("/rounds/:roundId/secret", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);
  const secret = req.body?.secret;

  // if a secret was provided, validate it
  if (secret !== undefined) {
    if (typeof secret !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(secret)) {
      res.status(400).json({ error: "secret must be a 0x-prefixed 32-byte hex string" });
      return;
    }
  }

  const onChainPhase = await getOnChainPhase(roundId);
  if (!["Open", "SaleClosed"].includes(onChainPhase)) {
    res.status(400).json({ error: `Cannot create secret: round is in phase ${onChainPhase}` });
    return;
  }

  const existing = await prisma.round.findUnique({ where: { id: roundId } });
  if (existing?.secret) {
    res.status(409).json({ error: "Secret already exists for this round. Use GET to retrieve it." });
    return;
  }

  const finalSecret = secret ?? generateSecret();
  const committedHash = hashSecret(finalSecret);

  const round = await prisma.round.upsert({
    where: { id: roundId },
    create: { id: roundId, secret: finalSecret, committedHash },
    update: { secret: finalSecret, committedHash },
  });

  await logUser(roundId, "CREATE_SECRET");

  res.status(201).json({
    roundId,
    committedHash: round.committedHash,
    message: "Secret stored. Use the committedHash when calling /commit. Retrieve the raw secret via GET /owner/rounds/:roundId/secret when ready to reveal.",
  });
});

// return the stored raw secret (for use in revealAndDraw)
ownerRouter.get("/rounds/:roundId/secret", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round?.secret) {
    res.status(404).json({ error: "No secret found for this round." });
    return;
  }

  res.json({ roundId, secret: round.secret, committedHash: round.committedHash });
});

// call closeSale() on-chain
ownerRouter.post("/rounds/:roundId/close-sale", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);

  const onChainPhase = await getOnChainPhase(roundId);
  if (onChainPhase !== "Open") {
    res.status(400).json({ error: `Round must be Open to close sale (currently ${onChainPhase})` });
    return;
  }

  const contract = getContract();
  const tx = await contract.closeSale();
  const receipt = await tx.wait();

  await prisma.round.upsert({
    where: { id: roundId },
    create: { id: roundId, phase: "SaleClosed", closeSaleTxHash: receipt.hash },
    update: { phase: "SaleClosed", closeSaleTxHash: receipt.hash },
  });

  await logUser(roundId, "CLOSE_SALE", receipt.hash);
  res.json({ message: "Sale closed on-chain.", txHash: receipt.hash, blockNumber: receipt.blockNumber });
});

// call commitHash() on-chain with the stored hash and collateral
ownerRouter.post("/rounds/:roundId/commit", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);
  const collateralEth = req.body?.collateralEth ?? process.env.DEFAULT_COLLATERAL_ETH ?? "0.1";

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round?.committedHash) {
    res.status(400).json({ error: "No committed hash found. Call POST /owner/rounds/:roundId/secret first." });
    return;
  }

  const onChainPhase = await getOnChainPhase(roundId);
  if (onChainPhase !== "SaleClosed") {
    res.status(400).json({ error: `Round must be in SaleClosed phase to commit (currently ${onChainPhase})` });
    return;
  }

  const collateralWei = ethers.parseEther(collateralEth);

  const contract = getContract();
  const tx = await contract.commitHash(round.committedHash, { value: collateralWei });
  const receipt = await tx.wait();

  const targetBlock = await contract.targetBlock(roundId);

  await prisma.round.update({
    where: { id: roundId },
    data: {
      phase: "Committed",
      commitTxHash: receipt.hash,
      collateral: collateralWei.toString(),
      targetBlock,
    },
  });

  await logUser(roundId, "COMMIT_HASH", receipt.hash);

  res.json({
    message: "Hash committed on-chain. Reveal after target block is mined.",
    txHash: receipt.hash,
    committedHash: round.committedHash,
    targetBlock: targetBlock.toString(),
    revealAvailableAfterBlock: targetBlock.toString(),
    revealDeadlineBlock: (targetBlock + 250n).toString(),
  });
});

// reveal the secret and draw the winner
ownerRouter.post("/rounds/:roundId/reveal", async (req, res) => {
  const roundId = parseInt(req.params.roundId, 10);

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round?.secret) {
    res.status(400).json({ error: "No secret found in DB for this round." });
    return;
  }
  if (!round.committedHash) {
    res.status(400).json({ error: "No committed hash found for this round." });
    return;
  }

  if (!verifyHash(round.secret, round.committedHash)) {
    res.status(500).json({ error: "CRITICAL: stored secret does not match stored hash. Manual investigation required." });
    return;
  }

  const onChainPhase = await getOnChainPhase(roundId);
  if (onChainPhase !== "Committed") {
    res.status(400).json({ error: `Round must be in Committed phase to reveal (currently ${onChainPhase})` });
    return;
  }

  const contract = getContract();
  const provider = contract.runner?.provider;
  if (!provider) throw new Error("No provider attached to contract");

  const currentBlock = await provider.getBlockNumber();
  const targetBlock = round.targetBlock ? Number(round.targetBlock) : 0;

  if (currentBlock <= targetBlock) {
    res.status(400).json({
      error: `Target block not reached yet. Current: ${currentBlock}, Target: ${targetBlock}. Wait ${targetBlock - currentBlock} more blocks.`,
      currentBlock,
      targetBlock,
      blocksRemaining: targetBlock - currentBlock,
    });
    return;
  }

  if (currentBlock > targetBlock + 250) {
    res.status(400).json({
      error: `Reveal window expired. Target block was ${targetBlock}, current is ${currentBlock}. The blockhash is no longer available.`,
      currentBlock,
      targetBlock,
    });
    return;
  }

  const tx = await contract.revealAndDraw(round.secret);
  const receipt = await tx.wait();

  const winnerAddress = await contract.winner(roundId);
  const prizePoolWei = await contract.prizePool(roundId);

  await prisma.round.update({
    where: { id: roundId },
    data: {
      phase: "Drawn",
      revealTxHash: receipt.hash,
      revealedAt: new Date(),
      winner: winnerAddress,
      prizePool: prizePoolWei.toString(),
    },
  });

  await logUser(roundId, "REVEAL", receipt.hash);

  res.json({
    message: "Winner drawn successfully.",
    txHash: receipt.hash,
    winner: winnerAddress,
    prizePoolEth: ethers.formatEther(prizePoolWei),
    blockNumber: receipt.blockNumber,
  });
});

// start a new round
ownerRouter.post("/rounds/new", async (req, res) => {
  const contract = getContract();

  const currentRound = await contract.currentRound();
  const currentPhase = await getOnChainPhase(Number(currentRound));

  if (!["Drawn", "Slashed"].includes(currentPhase)) {
    res.status(400).json({
      error: `Current round ${currentRound} must be Drawn or Slashed before starting a new round (currently ${currentPhase})`,
    });
    return;
  }

  const tx = await contract.startNewRound();
  const receipt = await tx.wait();

  const newRoundId = Number(currentRound) + 1;

  await prisma.round.upsert({
    where: { id: newRoundId },
    create: { id: newRoundId, phase: "Open" },
    update: { phase: "Open" },
  });

  await logUser(newRoundId, "START_ROUND", receipt.hash);

  res.json({ message: `Round ${newRoundId} started.`, roundId: newRoundId, txHash: receipt.hash });
});

export default ownerRouter;