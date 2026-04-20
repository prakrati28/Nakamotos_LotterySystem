"use client";

import { AlertOctagon } from "lucide-react";

export default function ContractAddressWarning() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 px-5 py-4 text-sm text-warn animate-fade-in">
      <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong className="block font-semibold">Contract address not configured.</strong>
        <span className="text-warn/80">
          Set <code className="rounded bg-warn/10 px-1 font-mono text-xs">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in your{" "}
          <code className="rounded bg-warn/10 px-1 font-mono text-xs">.env.local</code> file and restart
          the dev server. Copy <code className="rounded bg-warn/10 px-1 font-mono text-xs">.env.example</code> as a starting
          point.
        </span>
      </div>
    </div>
  );
}
