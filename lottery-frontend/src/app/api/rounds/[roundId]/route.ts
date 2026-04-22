import { NextRequest, NextResponse } from "next/server";
import { getServerContract, getOnChainPhase } from "@/lib/server/contract";
import { PHASE_MAP } from "@/abi/lottery";
import { ethers } from "ethers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { roundId: string } },
) {
  try {
    const roundId = parseInt(params.roundId, 10);
    if (isNaN(roundId)) {
      return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });
    }

    const contract = getServerContract();

    const [
      phaseNum,
      prizePoolWei,
      totalTickets,
      winnerAddr,
      ticketPriceWei,
      targetBlockRaw,
      prizeClaimed,
    ] = await Promise.all([
      contract.phase(BigInt(roundId)),
      contract.prizePool(BigInt(roundId)),
      contract.totalTickets(BigInt(roundId)),
      contract.winner(BigInt(roundId)),
      contract.ticketPrice(),
      contract.targetBlock(BigInt(roundId)),
      contract.prizeClaimed(BigInt(roundId)),
    ]);

    // Current block for reveal countdown
    const provider = contract.runner?.provider as ethers.JsonRpcProvider;
    const currentBlock = await provider.getBlockNumber();

    const phase = PHASE_MAP[Number(phaseNum)] ?? "Unknown";
    const targetBlock = Number(targetBlockRaw);
    const blocksUntilReveal =
      targetBlock > currentBlock ? targetBlock - currentBlock : 0;
    const revealWindowExpiry = targetBlock + 250;
    const isRevealWindowOpen =
      phase === "Committed" &&
      currentBlock > targetBlock &&
      currentBlock <= revealWindowExpiry;

    return NextResponse.json({
      roundId,
      phase,
      prizePool: ethers.formatEther(prizePoolWei),
      prizePoolWei: prizePoolWei.toString(),
      totalTickets: Number(totalTickets),
      winner: winnerAddr as string,
      ticketPrice: ethers.formatEther(ticketPriceWei),
      ticketPriceWei: ticketPriceWei.toString(),
      targetBlock,
      currentBlock,
      blocksUntilReveal,
      revealWindowExpiry,
      isRevealWindowOpen,
      prizeClaimed: Boolean(prizeClaimed),
    });
  } catch (err) {
    console.error("[GET /api/rounds/:roundId]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
