"use client";

import { AlertTriangle } from "lucide-react";

export default function ContractAddressWarning() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-orange-500/25 bg-orange-500/8 px-5 py-4 text-sm animate-fade-in">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
      <div>
        <p className="font-semibold text-orange-300">Contract address not configured</p>
        <p className="mt-0.5 text-orange-400/70">
          Set{" "}
          <code className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[11px] text-orange-300">
            NEXT_PUBLIC_CONTRACT_ADDRESS
          </code>{" "}
          in your{" "}
          <code className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[11px] text-orange-300">
            .env
          </code>{" "}
          file and restart the development server.
        </p>
      </div>
    </div>
  );
}
