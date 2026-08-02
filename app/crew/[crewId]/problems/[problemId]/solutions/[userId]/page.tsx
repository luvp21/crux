import { notFound } from "next/navigation";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
import { getSubmissionTimeline } from "@/lib/submission-timeline";
import { PulseStrip } from "@/components/pulse-strip";

export default async function SolutionDetailPage({
  params,
}: {
  params: { crewId: string; problemId: string; userId: string };
}) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const rows = await getCrewSolutionsForProblem(session.user.id, params.crewId, params.problemId);
  const row = rows?.find((r) => r.userId === params.userId);

  if (!row || row.status !== "visible") {
    // Covers: not a crew member (rows is null — requireCrewMember above already
    // redirects that case), no submission yet, or still locked for this viewer.
    notFound();
  }

  const timeline = await getSubmissionTimeline(session.user.id, row.submissionId);
  if (!timeline.ok) {
    notFound();
  }

  const latestCode = timeline.checkpoints.at(-1)?.code ?? "";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
        {row.verdict} · {timeline.timeSpentLabel}
      </div>
      <div style={{ marginBottom: 24 }}>
        <PulseStrip checkpoints={timeline.checkpoints} />
      </div>
      <pre
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          padding: 20,
          fontSize: 12.5,
          lineHeight: 1.6,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {latestCode}
      </pre>
    </div>
  );
}
