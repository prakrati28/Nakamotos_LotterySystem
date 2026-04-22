import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import { getServerContract, getOnChainPhase } from "@/lib/server/contract";

type Ctx = { params: { roundId: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  const roundId = parseInt(params.roundId, 10);
  if (isNaN(roundId))
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const collateralEth =
      body?.collateralEth ?? process.env.DEFAULT_COLLATERAL_ETH ?? "0.1";

    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round?.committedHash) {
      return NextResponse.json(
        {
          error:
            "No committed hash found. Call POST /api/owner/rounds/:roundId/secret first.",
        },
        { status: 400 },
      );
    }

    const phase = await getOnChainPhase(roundId);
    if (phase !== "SaleClosed") {
      return NextResponse.json(
        {
          error: `Round must be in SaleClosed phase to commit (currently ${phase}).`,
        },
        { status: 400 },
      );
    }

    const collateralWei = ethers.parseEther(String(collateralEth));
    const contract = getServerContract();
    const tx = await contract.commitHash(round.committedHash, {
      value: collateralWei,
    });
    const receipt = await tx.wait();

    const targetBlockRaw = await contract.targetBlock(BigInt(roundId));
    const targetBlock = BigInt(targetBlockRaw);

    await prisma.round.update({
      where: { id: roundId },
      data: {
        phase: "Committed",
        commitTxHash: receipt.hash,
        collateral: collateralWei.toString(),
        targetBlock,
      },
    });
    await prisma.userLog.create({
      data: { roundId, action: "COMMIT_HASH", txHash: receipt.hash },
    });

    return NextResponse.json({
      message: "Hash committed on-chain.",
      txHash: receipt.hash,
      committedHash: round.committedHash,
      targetBlock: targetBlock.toString(),
      revealAvailableAfterBlock: targetBlock.toString(),
      revealDeadlineBlock: (targetBlock + 250n).toString(),
    });
  } catch (err) {
    console.error("[POST /api/owner/rounds/:roundId/commit]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
