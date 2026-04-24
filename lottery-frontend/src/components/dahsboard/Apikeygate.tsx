"use client";

import { useState } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function ApiKeyGate({
  onSubmit,
}: {
  onSubmit: (key: string) => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError("Please enter the owner API key.");
      return;
    }
    setError("");
    onSubmit(key.trim());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-lbg px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-lborder bg-lcard">
            <ShieldCheck className="h-7 w-7 text-laccent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ltext">
            Owner Dashboard
          </h1>
          <p className="mt-2 text-sm text-ldim">
            Enter your API key to access round management controls.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-lborder bg-lsurface p-6 shadow-lpanel"
        >
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ldim">
            Owner API Key
          </label>
          <div className="relative mb-4">
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter x-owner-key…"
              className="w-full rounded-lg border border-lborder bg-lbg px-4 py-3 pr-12 text-sm text-ltext placeholder-ldim outline-none transition-all focus:border-laccent/60 focus:ring-2 focus:ring-laccent/15"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ldim transition-colors hover:text-lsubtle"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-laccent py-3 text-sm font-semibold text-white transition-all hover:bg-laccenthi active:scale-95"
          >
            Access Dashboard
          </button>

          {/* <p className="mt-4 text-center text-[11px] text-ldim">
            The key is stored in localStorage and sent as{" "}
            <code className="rounded bg-lghost px-1 font-mono text-[10px]">
              x-owner-key
            </code>{" "}
            header on all API requests.
          </p> */}
        </form>
      </div>
    </div>
  );
}
