import { type ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warn" | "accent" | "muted";
}

const variantMap: Record<string, string> = {
  default: "bg-surface text-subtle border-border",
  success: "bg-success/10 text-success border-success/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  muted: "bg-surface text-muted border-border/50",
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantMap[variant]}`}
    >
      {children}
    </span>
  );
}
