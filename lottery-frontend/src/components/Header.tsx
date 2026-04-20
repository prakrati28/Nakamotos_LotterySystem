"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  ExternalLink,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { WalletState } from "@/hooks/useWallet";
import { shortAddress, etherscanAddr } from "@/lib/utils";
import { CHAIN_NAME, TARGET_CHAIN_ID } from "@/lib/constants";

interface HeaderProps {
  wallet: WalletState;
}

/** Dropdown menu shown when the connected address chip is clicked */
function WalletDropdown({
  wallet,
  onClose,
}: {
  wallet: WalletState;
  onClose: () => void;
}) {
  const {
    address,
    isCorrectNetwork,
    switchAccount,
    disconnect,
    isSwitchingAccount,
  } = wallet;
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSwitchAccount = async () => {
    onClose();
    await switchAccount();
  };

  const handleDisconnect = () => {
    onClose();
    disconnect();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-64 animate-fade-in overflow-hidden rounded-xl border border-lborder bg-lcard shadow-lpanel"
    >
      {/* Account header */}
      <div className="border-b border-lborder bg-lsurface px-4 py-3">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-ldim">
          Connected Account
        </p>
        <div className="flex items-center gap-2.5">
          {/* Identicon-style avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white ring-2 ring-lborder">
            {address!.slice(2, 4).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-semibold text-ltext">
              {shortAddress(address!)}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isCorrectNetwork ? "bg-emerald-400" : "bg-orange-400"}`}
              />
              <span className="text-[10px] text-ldim">
                {isCorrectNetwork ? CHAIN_NAME : `Wrong network`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-1.5">
        {/* View on Etherscan */}
        <a
          href={etherscanAddr(address!)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-lsubtle transition-colors hover:bg-lghost hover:text-ltext"
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-ldim" />
          View on Etherscan
        </a>

        {/* Switch Account */}
        <button
          onClick={handleSwitchAccount}
          disabled={isSwitchingAccount}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-lsubtle transition-colors hover:bg-lghost hover:text-ltext disabled:opacity-50"
        >
          {isSwitchingAccount ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ldim/30 border-t-lsubtle" />
          ) : (
            <ArrowLeftRight className="h-4 w-4 shrink-0 text-ldim" />
          )}
          {isSwitchingAccount ? "Opening picker…" : "Switch Account"}
        </button>

        {/* Divider */}
        <div className="my-1.5 border-t border-lborder" />

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default function Header({ wallet }: HeaderProps) {
  const {
    address,
    chainId,
    isConnected,
    isCorrectNetwork,
    connect,
    switchNetwork,
    isConnecting,
  } = wallet;

  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-lborder bg-lbg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8">
                <path
                  d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
                  fill="rgba(59,130,246,0.15)"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                />
                <path
                  d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z"
                  fill="#3B82F6"
                  opacity="0.8"
                />
              </svg>
            </div>
            <div>
              <span className="font-display text-[17px] font-bold tracking-tight text-ltext">
                Lotto<span className="text-laccent">Chain</span>
              </span>
              <span className="ml-2 hidden text-[10px] font-medium uppercase tracking-widest text-ldim sm:inline">
                Protocol
              </span>
            </div>
          </div>

          {/* ── Nav centre ───────────────────────────────────────────── */}
          {/* <nav className="hidden items-center gap-1 md:flex">
            {["Dashboard", "History", "Docs"].map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-md px-3 py-1.5 text-sm text-lsubtle transition-colors hover:bg-lghost hover:text-ltext"
              >
                {item}
              </a>
            ))}
          </nav> */}

          {/* ── Right: network + wallet ──────────────────────────────── */}
          <div className="flex items-center gap-2.5">
            {/* Network pill (only when connected) */}
            {isConnected && (
              <button
                onClick={!isCorrectNetwork ? switchNetwork : undefined}
                className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all sm:flex ${
                  isCorrectNetwork
                    ? "cursor-default bg-emerald-500/8 text-emerald-400 ring-emerald-500/20"
                    : "animate-pulse cursor-pointer bg-orange-500/10 text-orange-400 ring-orange-500/25 hover:bg-orange-500/15"
                }`}
                title={
                  !isCorrectNetwork ? `Click to switch to ${CHAIN_NAME}` : ""
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCorrectNetwork ? "bg-emerald-400" : "bg-orange-400"
                  }`}
                />
                {isCorrectNetwork ? CHAIN_NAME : `Switch to ${CHAIN_NAME}`}
              </button>
            )}

            {/* Wallet chip / Connect button */}
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                    dropdownOpen
                      ? "border-laccent/40 bg-lghost text-ltext"
                      : "border-lborder bg-lsurface text-lsubtle hover:border-lborderhi hover:text-ltext"
                  }`}
                >
                  {/* Mini avatar */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white ring-1 ring-white/10">
                    {address!.slice(2, 4).toUpperCase()}
                  </span>
                  <span className="font-mono text-xs">
                    {shortAddress(address!)}
                  </span>
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-ldim transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <WalletDropdown
                    wallet={wallet}
                    onClose={() => setDropdownOpen(false)}
                  />
                )}
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-2 rounded-lg bg-laccent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:opacity-60"
              >
                {isConnecting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wrong network banner */}
      {isConnected && !isCorrectNetwork && (
        <div className="border-b border-orange-500/20 bg-orange-500/8 px-6 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-orange-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Connected to chain{" "}
                <span className="font-mono font-semibold">{chainId}</span> —
                this app requires{" "}
                <span className="font-semibold">{CHAIN_NAME}</span> (chain{" "}
                <span className="font-mono">{TARGET_CHAIN_ID}</span>).
              </span>
            </div>
            <button
              onClick={switchNetwork}
              className="ml-4 shrink-0 rounded-md bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300 ring-1 ring-orange-500/30 transition hover:bg-orange-500/30"
            >
              Switch Network
            </button>
          </div>
        </div>
      )}
    </>
  );
}
