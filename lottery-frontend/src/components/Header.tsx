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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-full animate-fade-in overflow-hidden rounded-xl border border-lborder bg-lcard shadow-lpanel"
    >
      <div className="border-b border-lborder bg-lsurface px-4 py-3.5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ldim">
          Connected Account
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white ring-2 ring-lborder">
            {address!.slice(2, 4).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-ltext">
              {shortAddress(address!)}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isCorrectNetwork ? "bg-emerald-400" : "bg-orange-400"}`}
              />
              <span className="text-xs text-ldim">
                {isCorrectNetwork ? CHAIN_NAME : "Wrong network"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-1.5">
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
        <button
          onClick={async () => {
            onClose();
            await switchAccount();
          }}
          disabled={isSwitchingAccount}
          className="flex w-full items-center gap-3 text-start rounded-lg px-3 py-2.5 text-sm text-lsubtle transition-colors hover:bg-lghost hover:text-ltext disabled:opacity-50"
        >
          {isSwitchingAccount ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ldim/30 border-t-lsubtle" />
          ) : (
            <ArrowLeftRight className="h-4 w-4 shrink-0 text-ldim" />
          )}
          {isSwitchingAccount ? "Opening picker…" : "Switch Account"}
        </button>
        <div className="my-1.5 border-t border-lborder" />
        <button
          onClick={() => {
            onClose();
            disconnect();
          }}
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
      <header className="sticky top-0 z-50 border-b border-lborder/60 bg-lbg/85 backdrop-blur-xl">
        <div className="mx-auto flex flex-col md:flex-row gap-2 max-w-7xl items-center justify-between px-6 py-4 md:py-2">
          {/* Logo */}
          <div className="flex items-center gap-3 self-start">
            <div className="relative flex h-9 w-9 items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="h-9 w-9">
                <path
                  d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
                  fill="rgba(79,142,247,0.18)"
                  stroke="#4F8EF7"
                  strokeWidth="1.5"
                />
                <path
                  d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z"
                  fill="#4F8EF7"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[20px] font-bold tracking-tight text-ltext">
                Lotto<span className="text-laccent">Chain</span>
              </span>
              <span className="hidden text-xs font-medium uppercase tracking-widest text-ldim sm:inline">
                Protocol
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 self-end">
            {isConnected && (
              <button
                onClick={!isCorrectNetwork ? switchNetwork : undefined}
                className={`hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition-all sm:flex ${
                  isCorrectNetwork
                    ? "cursor-default bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
                    : "animate-pulse cursor-pointer bg-orange-500/10 text-orange-300 ring-orange-500/30 hover:bg-orange-500/15"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isCorrectNetwork ? "bg-emerald-400" : "bg-orange-400"}`}
                />
                {isCorrectNetwork ? CHAIN_NAME : `Switch to ${CHAIN_NAME}`}
              </button>
            )}

            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                    dropdownOpen
                      ? "border-laccent/50 bg-lghost text-ltext"
                      : "border-lborder bg-lsurface text-lsubtle hover:border-lborderhi hover:text-ltext"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-[10px] font-bold text-white">
                    {address!.slice(2, 4).toUpperCase()}
                  </span>
                  <span className="font-mono text-[13px]">
                    {shortAddress(address!)}
                  </span>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-ldim transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
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
                className="flex items-center gap-2 rounded-xl bg-laccent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-laccenthi active:scale-95 disabled:opacity-60"
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
        <div className="border-b border-orange-500/20 bg-orange-500/8 px-6 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-orange-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Connected to chain{" "}
                <span className="font-mono font-semibold">{chainId}</span> —
                requires <span className="font-semibold">{CHAIN_NAME}</span>{" "}
                (chain <span className="font-mono">{TARGET_CHAIN_ID}</span>).
              </span>
            </div>
            <button
              onClick={switchNetwork}
              className="ml-4 shrink-0 rounded-lg bg-orange-500/20 px-3.5 py-1.5 text-xs font-semibold text-orange-300 ring-1 ring-orange-500/30 transition hover:bg-orange-500/30"
            >
              Switch Network
            </button>
          </div>
        </div>
      )}
    </>
  );
}
