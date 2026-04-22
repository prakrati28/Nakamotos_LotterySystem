import { NextRequest, NextResponse } from "next/server";
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
    const phase = await getOnChainPhase(roundId);
    if (phase !== "Open") {
      return NextResponse.json(
        { error: `Round must be Open to close sale (currently ${phase}).` },
        { status: 400 },
      );
    }

    const contract = getServerContract();
    const tx = await contract.closeSale();
    const receipt = await tx.wait();

    await prisma.round.upsert({
      where: { id: roundId },
      create: {
        id: roundId,
        phase: "SaleClosed",
        closeSaleTxHash: receipt.hash,
      },
      update: { phase: "SaleClosed", closeSaleTxHash: receipt.hash },
    });
    await prisma.userLog.create({
      data: { roundId, action: "CLOSE_SALE", txHash: receipt.hash },
    });

    return NextResponse.json({
      message: "Sale closed on-chain.",
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("[POST /api/owner/rounds/:roundId/close-sale]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
