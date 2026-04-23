import { ethers } from "ethers";
import { LOTTERY_ABI, PHASE_MAP } from "@/abi/lottery";

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _contract: ethers.Contract | null = null;

export function getServerProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) throw new Error("RPC_URL environment variable is not set.");
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

export function getServerSigner(): ethers.Wallet {
  if (!_signer) {
    const pk = process.env.OWNER_PRIVATE_KEY;
    if (!pk)
      throw new Error("OWNER_PRIVATE_KEY environment variable is not set.");
    _signer = new ethers.Wallet(pk, getServerProvider());
  }
  return _signer;
}

export function getServerContract(): ethers.Contract {
  if (!_contract) {
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!addr) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
    _contract = new ethers.Contract(addr, LOTTERY_ABI, getServerSigner());
  }
  return _contract;
}

export async function getOnChainPhase(roundId: number): Promise<string> {
  const contract = getServerContract();
  const phaseNum = await contract.phase(BigInt(roundId));
  return PHASE_MAP[Number(phaseNum)] ?? "Unknown";
}
