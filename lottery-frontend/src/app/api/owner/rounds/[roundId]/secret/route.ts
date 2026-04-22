import { NextRequest, NextResponse } from "next/server";
import { requireOwnerAuth } from "@/lib/server/ownerAuth";
import { prisma } from "@/lib/server/prisma";
import { getOnChainPhase } from "@/lib/server/contract";
import { generateSecret, hashSecret } from "@/lib/server/crypto";

type Ctx = { params: { roundId: string } };

/** GET — retrieve the stored secret + hash for a round */
export async function GET(req: NextRequest, { params }: Ctx) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  const roundId = parseInt(params.roundId, 10);
  if (isNaN(roundId))
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round?.secret) {
    return NextResponse.json(
      { error: "No secret found for this round." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    roundId,
    secret: round.secret,
    committedHash: round.committedHash,
  });
}

/** POST — generate (or accept) a secret and store it */
export async function POST(req: NextRequest, { params }: Ctx) {
  const authError = requireOwnerAuth(req);
  if (authError) return authError;

  const roundId = parseInt(params.roundId, 10);
  if (isNaN(roundId))
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });

  // Optional: caller can provide their own secret
  const body = await req.json().catch(() => ({}));
  const secret = body?.secret as string | undefined;

  if (secret !== undefined) {
    if (typeof secret !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(secret)) {
      return NextResponse.json(
        {
          error:
            "secret must be a 0x-prefixed 32-byte hex string (64 hex chars).",
        },
        { status: 400 },
      );
    }
  }

  const phase = await getOnChainPhase(roundId);
  if (!["Open", "SaleClosed"].includes(phase)) {
    return NextResponse.json(
      { error: `Cannot create secret: round is in phase ${phase}.` },
      { status: 400 },
    );
  }

  const existing = await prisma.round.findUnique({ where: { id: roundId } });
  if (existing?.secret) {
    return NextResponse.json(
      {
        error:
          "Secret already exists. GET /api/owner/rounds/:roundId/secret to retrieve it.",
      },
      { status: 409 },
    );
  }

  const finalSecret = secret ?? generateSecret();
  const committedHash = hashSecret(finalSecret);

  await prisma.round.upsert({
    where: { id: roundId },
    create: { id: roundId, secret: finalSecret, committedHash },
    update: { secret: finalSecret, committedHash },
  });
  await prisma.userLog.create({ data: { roundId, action: "CREATE_SECRET" } });

  return NextResponse.json(
    {
      roundId,
      committedHash,
      message:
        "Secret stored. Use committedHash when calling /commit. Retrieve it via GET when ready to reveal.",
    },
    { status: 201 },
  );
}
