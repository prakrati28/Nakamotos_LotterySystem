import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import { getServerContract } from "@/lib/server/contract";

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

export async function GET(req: NextRequest) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  try {
    // Fetch the current on-chain round number
    const contract = getServerContract();
    const currentRound = Number(await contract.currentRound());

    const rounds = await prisma.round.findMany({
      orderBy: { id: "desc" },
      include: {
        userlog: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ currentRound, rounds: serializeBigInt(rounds) });
  } catch (err) {
    console.error("[GET /api/owner/rounds]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
