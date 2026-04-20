import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ children, className = "", glow = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-card ${
        glow ? "shadow-glow border-accent/20" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
