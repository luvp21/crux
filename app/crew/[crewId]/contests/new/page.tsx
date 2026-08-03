import { redirect } from "next/navigation";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { listProblems } from "@/lib/problems";
import { getActiveContest } from "@/lib/contests";
import { ContestForm } from "@/components/contests/contest-form";

export default async function NewContestPage({ params }: { params: { crewId: string } }) {
  const session = await requireSession();
  const membership = await requireCrewMember(session.user.id, params.crewId);

  if (membership.role !== "owner") redirect(`/crew/${params.crewId}`);

  const activeContest = await getActiveContest(params.crewId);
  if (activeContest) redirect(`/crew/${params.crewId}`);

  const problems = await listProblems();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 28px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "10.5px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 14,
          }}
        >
          crew.contest // new
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
            margin: "0 0 8px",
          }}
        >
          Start a contest
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.6 }}>
          Pick problems by topic and difficulty, or let auto-select choose. Everyone in the crew practices together
          for the duration you set.
        </p>
        <ContestForm crewId={params.crewId} problems={problems} />
      </div>
    </div>
  );
}
