"use client";

import { ExternalLink, ClipboardList } from "lucide-react";
import type { AuditLog as AuditLogEntry } from "@/hooks/useOwnerApi";
import { etherscanTx } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  START_ROUND: "bg-emerald-500/12 text-emerald-300",
  CLOSE_SALE: "bg-orange-500/12  text-orange-300",
  CREATE_SECRET: "bg-yellow-500/12  text-yellow-300",
  COMMIT_HASH: "bg-blue-500/12    text-blue-300",
  REVEAL: "bg-purple-500/12  text-purple-300",
};

const ACTION_LABELS: Record<string, string> = {
  START_ROUND: "Start Round",
  CLOSE_SALE: "Close Sale",
  CREATE_SECRET: "Generate Secret",
  COMMIT_HASH: "Commit Hash",
  REVEAL: "Reveal & Draw",
};

export default function AuditLog({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-ldim" />
        <span className="text-xs font-semibold uppercase tracking-widest text-ldim">
          Audit Log
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-lborder">
        <table className="w-full">
          <thead>
            <tr className="border-b border-lborder bg-lcard">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ldim">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ldim">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ldim">
                Tx Hash
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lborder">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="bg-lsurface transition-colors hover:bg-lcard"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[log.action] ?? "bg-lghost text-lsubtle"}`}
                  >
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ldim">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {log.txHash ? (
                    <a
                      href={etherscanTx(log.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-laccent hover:text-laccenthi"
                    >
                      {log.txHash.slice(0, 10)}…{log.txHash.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-ldim">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
