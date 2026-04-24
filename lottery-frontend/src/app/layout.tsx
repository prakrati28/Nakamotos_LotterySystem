import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
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
    <html lang="en" className={outfit.variable}>
      <head />
      <body>
        {children}
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 72 }}
          toastOptions={{
            duration: 6000,
            style: {
              background: "#101828",
              color: "#F0F5FF",
              border: "1px solid #1E2E46",
              borderRadius: "12px",
              fontSize: "14px",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              padding: "13px 17px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.5)",
              maxWidth: "390px",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#101828" },
            },
            error: { iconTheme: { primary: "#EF4444", secondary: "#101828" } },
            loading: {
              iconTheme: { primary: "#4F8EF7", secondary: "#101828" },
            },
          }}
        />
      </body>
    </html>
  );
}
