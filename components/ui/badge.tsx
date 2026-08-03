import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "muted" | "accent";
}

export function Badge({ children, tone = "muted" }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${tone === "accent" ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: "10.5px",
        letterSpacing: "0.06em",
        color: tone === "accent" ? "var(--accent)" : "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}
