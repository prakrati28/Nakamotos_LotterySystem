import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import {
  getServerContract,
  getOnChainPhase,
  getServerProvider,
} from "@/lib/server/contract";
import { verifyHash } from "@/lib/server/crypto";

type Ctx = { params: { roundId: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  const roundId = parseInt(params.roundId, 10);
  if (isNaN(roundId))
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });

  try {
    const round = await prisma.round.findUnique({ where: { id: roundId } });

    if (!round?.secret) {
      return NextResponse.json(
        { error: "No secret found in DB for this round." },
        { status: 400 },
      );
    }
    if (!round.committedHash) {
      return NextResponse.json(
        { error: "No committed hash found for this round." },
        { status: 400 },
      );
    }

    if (!verifyHash(round.secret, round.committedHash)) {
      return NextResponse.json(
        {
          error:
            "CRITICAL: stored secret does not match stored hash. Manual investigation required.",
        },
        { status: 500 },
      );
    }

    const phase = await getOnChainPhase(roundId);
    if (phase !== "Committed") {
      return NextResponse.json(
        {
          error: `Round must be in Committed phase to reveal (currently ${phase}).`,
        },
        { status: 400 },
      );
    }

    const provider = getServerProvider();
    const currentBlock = await provider.getBlockNumber();
    const targetBlock = round.targetBlock ? Number(round.targetBlock) : 0;

    if (currentBlock <= targetBlock) {
      return NextResponse.json(
        {
          error: `Target block not yet reached. Wait ${targetBlock - currentBlock} more blocks.`,
          currentBlock,
          targetBlock,
          blocksRemaining: targetBlock - currentBlock,
        },
        { status: 400 },
      );
    }

    if (currentBlock > targetBlock + 250) {
      return NextResponse.json(
        {
          error: `Reveal window expired. Target: ${targetBlock}, Current: ${currentBlock}. The blockhash is no longer available.`,
          currentBlock,
          targetBlock,
        },
        { status: 400 },
      );
    }

    const contract = getServerContract();
    const tx = await contract.revealAndDraw(round.secret);
    const receipt = await tx.wait();
    const winnerAddr = await contract.winner(BigInt(roundId));
    const prizePoolWei = await contract.prizePool(BigInt(roundId));

    await prisma.round.update({
      where: { id: roundId },
      data: {
        phase: "Drawn",
        revealTxHash: receipt.hash,
        revealedAt: new Date(),
        winner: winnerAddr as string,
        prizePool: prizePoolWei.toString(),
      },
    });
    await prisma.userLog.create({
      data: { roundId, action: "REVEAL", txHash: receipt.hash },
    });

    return NextResponse.json({
      message: "Winner drawn successfully.",
      txHash: receipt.hash,
      winner: winnerAddr,
      prizePoolEth: ethers.formatEther(prizePoolWei),
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("[POST /api/owner/rounds/:roundId/reveal]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
