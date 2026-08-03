import type { ReactNode } from "react";

interface KickerProps {
  children: ReactNode;
  tone?: "muted" | "accent";
}

export function Kicker({ children, tone = "accent" }: KickerProps) {
  return (
    <div
      style={{
        fontFamily: "var(--font-jetbrains-mono)",
        fontSize: "10.5px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: tone === "accent" ? "var(--accent)" : "var(--muted)",
      }}
    >
      {children}
    </div>
  );
}
