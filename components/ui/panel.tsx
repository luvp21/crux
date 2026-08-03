import type { CSSProperties, ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number | string;
}

export function Panel({ children, style, padding = 16 }: PanelProps) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
