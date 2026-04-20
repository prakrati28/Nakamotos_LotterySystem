import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "LottoChain — Commit-Reveal Lottery",
  description:
    "A decentralized lottery with provably fair commit-reveal randomness on Ethereum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#16161F",
              color: "#E8E8F0",
              border: "1px solid #1E1E2E",
              borderRadius: "12px",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
            },
            success: {
              iconTheme: { primary: "#4ADE80", secondary: "#16161F" },
            },
            error: {
              iconTheme: { primary: "#FF6B35", secondary: "#16161F" },
            },
          }}
        />
      </body>
    </html>
  );
}
