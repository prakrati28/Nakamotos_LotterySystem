import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import { getServerContract, getOnChainPhase } from "@/lib/server/contract";

export async function POST(req: NextRequest) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  try {
    const contract = getServerContract();
    const currentRound = Number(await contract.currentRound());
    const currentPhase = await getOnChainPhase(currentRound);

    if (!["Drawn", "Slashed"].includes(currentPhase)) {
      return NextResponse.json(
        {
          error: `Round ${currentRound} must be Drawn or Slashed before starting a new round (currently ${currentPhase}).`,
        },
        { status: 400 },
      );
    }

    const tx = await contract.startNewRound();
    const receipt = await tx.wait();
    const newId = currentRound + 1;

    await prisma.round.upsert({
      where: { id: newId },
      create: { id: newId, phase: "Open" },
      update: { phase: "Open" },
    });
    await prisma.userLog.create({
      data: { roundId: newId, action: "START_ROUND", txHash: receipt.hash },
    });

    return NextResponse.json({
      message: `Round ${newId} started.`,
      roundId: newId,
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("[POST /api/owner/rounds/new]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
