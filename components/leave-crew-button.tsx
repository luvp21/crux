"use client";

import { useTransition } from "react";
import { SignOut } from "@phosphor-icons/react";
import { leaveCrew } from "@/app/crew/[crewId]/actions";

interface LeaveCrewButtonProps {
  crewId: string;
  crewName: string;
  role: "owner" | "member";
  otherMemberCount: number;
}

export function LeaveCrewButton({ crewId, crewName, role, otherMemberCount }: LeaveCrewButtonProps) {
  const [pending, startTransition] = useTransition();

  const confirmCopy =
    role === "owner" && otherMemberCount > 0
      ? `Leave "${crewName}"? Ownership will pass to the longest-standing member.`
      : role === "owner"
        ? `Leave "${crewName}"? You're the only member, so the crew will be left empty.`
        : `Leave "${crewName}"?`;

  return (
    <button
      onClick={() => {
        if (!window.confirm(confirmCopy)) return;
        startTransition(async () => {
          await leaveCrew(crewId);
        });
      }}
      disabled={pending}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        background: "none",
        border: "1px solid var(--line)",
        color: "var(--muted)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: "10.5px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      <SignOut size={13} weight="bold" />
      {pending ? "leaving..." : "leave crew"}
    </button>
  );
}
