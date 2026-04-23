import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import { getServerContract, getOnChainPhase } from "@/lib/server/contract";

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
    const contract = getServerContract();
    const currentRound = Number(await contract.currentRound());

    const dbRounds = await prisma.round.findMany({
      orderBy: { id: "desc" },
      include: { userlog: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    const rounds = await Promise.all(
      dbRounds.map(async (round) => {
        try {
          const onChainPhase = await getOnChainPhase(round.id);
          if (onChainPhase !== round.phase && onChainPhase !== "Unknown") {
            await prisma.round
              .update({
                where: { id: round.id },
                data: { phase: onChainPhase as never },
              })
              .catch(() => {});
          }
          return { ...round, phase: onChainPhase, onChainPhase };
        } catch {
          return { ...round, onChainPhase: round.phase };
        }
      }),
    );

    return NextResponse.json({ currentRound, rounds: serializeBigInt(rounds) });
  } catch (err) {
    console.error("[GET /api/owner/rounds]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
