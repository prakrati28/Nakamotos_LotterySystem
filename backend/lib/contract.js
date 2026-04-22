import { ethers } from "ethers";
// specific ABIs required by the backend
const LOTTERY_ABI = [
    // Read
    "function currentRound() view returns (uint256)",
    "function phase(uint256 roundId) view returns (uint8)",
    "function committedHash(uint256 roundId) view returns (bytes32)",
    "function targetBlock(uint256 roundId) view returns (uint256)",
    "function prizePool(uint256 roundId) view returns (uint256)",
    "function winner(uint256 roundId) view returns (address)",
    "function totalTickets(uint256 roundId) view returns (uint256)",
    // Write (owner only)
    "function closeSale() external",
    "function commitHash(bytes32 _hash) external payable",
    "function revealAndDraw(bytes32 _secret) external",
    "function startNewRound() external",
    // Events
    "event HashCommitted(uint256 indexed roundId, bytes32 indexed hash)",
    "event WinnerDrawn(uint256 indexed roundId, address indexed winner, uint256 prizeAmount)",
    "event SaleClosed(uint256 indexed roundId)",
    "event RoundStarted(uint256 indexed roundId)",
];
const Phase = {
    0: "Open",
    1: "SaleClosed",
    2: "Committed",
    3: "Drawn",
    4: "Slashed",
};
let _provider = null;
let _signer = null;
let _contract = null;
function getProvider() {
    if (!_provider) {
        _provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    }
    return _provider;
}
function getSigner() {
    if (!_signer) {
        _signer = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, getProvider());
    }
    return _signer;
}
function getContract() {
    if (!_contract) {
        _contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, LOTTERY_ABI, getSigner());
    }
    return _contract;
}
/** Fetch the current on-chain phase for a round */
async function getOnChainPhase(roundId) {
    const contract = getContract();
    const phaseNum = await contract.phase(roundId);
    return Phase[phaseNum] ?? "Unknown";
}
export { LOTTERY_ABI, Phase, getProvider, getContract, getOnChainPhase, getSigner };
//# sourceMappingURL=contract.js.map