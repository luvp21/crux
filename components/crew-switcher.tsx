import type { CSSProperties } from "react";
import Link from "next/link";
import { CaretDown, Plus } from "@phosphor-icons/react/ssr";

export interface CrewSwitcherCrew {
  crewId: string;
  crewName: string;
  role: "owner" | "member";
}

interface CrewSwitcherProps {
  crews: CrewSwitcherCrew[];
  activeCrewId: string;
  triggerStyle?: CSSProperties;
}

/** Native <details>/<summary> disclosure — no client JS needed for a simple
 * crew picker, and navigating to a different crew route unmounts it anyway. */
export function CrewSwitcher({ crews, activeCrewId, triggerStyle }: CrewSwitcherProps) {
  const active = crews.find((c) => c.crewId === activeCrewId);

  if (crews.length <= 1) {
    return (
      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)", ...triggerStyle }}>
        {active?.crewName ?? "crew"}
      </span>
    );
  }

  return (
    <details style={{ position: "relative" }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 700,
          fontSize: 13,
          color: "var(--fg)",
          ...triggerStyle,
        }}
      >
        {active?.crewName ?? "crew"}
        <CaretDown size={12} weight="bold" color="var(--muted)" />
      </summary>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          zIndex: 20,
          minWidth: 200,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {crews.map((c) => (
          <Link
            key={c.crewId}
            href={`/crew/${c.crewId}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 14px",
              fontSize: 12,
              borderBottom: "1px solid var(--line)",
              color: c.crewId === activeCrewId ? "var(--accent)" : "var(--fg)",
              background: c.crewId === activeCrewId ? "var(--raise)" : "transparent",
            }}
          >
            <span>{c.crewName}</span>
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {c.role}
            </span>
          </Link>
        ))}
        <Link
          href="/crew/new"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <Plus size={13} weight="bold" />
          join or create another
        </Link>
      </div>
    </details>
  );
}
