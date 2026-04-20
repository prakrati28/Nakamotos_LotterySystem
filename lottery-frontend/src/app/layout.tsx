import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Load Syne via next/font for optimal performance (no FOUC)
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LottoChain — On-Chain Lottery",
  description:
    "A decentralised lottery with provably fair commit-reveal randomness on Ethereum.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={syne.variable}>
      <head />
      <body>
        {children}
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 70 }}
          toastOptions={{
            duration: 6000,
            style: {
              background: "#111827",
              color: "#F1F5F9",
              border: "1px solid #1F2A3C",
              borderRadius: "10px",
              fontSize: "13.5px",
              fontFamily: "Geist, DM Sans, sans-serif",
              padding: "12px 16px",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.5)",
              maxWidth: "380px",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#111827" },
            },
            error: {
              iconTheme: { primary: "#EF4444", secondary: "#111827" },
            },
            loading: {
              iconTheme: { primary: "#3B82F6", secondary: "#111827" },
            },
          }}
        />
      </body>
    </html>
  );
}
