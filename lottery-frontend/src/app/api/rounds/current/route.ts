import { NextResponse } from "next/server";
import { getServerContract } from "@/lib/server/contract";

export async function GET() {
  try {
    const contract = getServerContract();
    const currentRound = Number(await contract.currentRound());
    return NextResponse.json({ currentRound });
  } catch (err) {
    console.error("[GET /api/rounds/current]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
