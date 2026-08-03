import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
import { getSubmissionTimeline } from "@/lib/submission-timeline";
import { PulseStrip } from "@/components/pulse-strip";
import { SiteNav } from "@/components/site-nav";

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

  // The actually-submitted code (submissions.code), not the last checkpoint:
  // a fast solve can have zero checkpoints, and the checkpoint posted during
  // handleSubmit is fire-and-forget so it can lose a race against submission
  // creation. `timeline.checkpoints` stays checkpoint-based for the Pulse
  // Strip waveform and time-spent label only.
  const submittedCode = timeline.code;

  return (
    <div style={{ minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 28px" }}>
        <Link
          href={`/crew/${params.crewId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={12} weight="bold" />
          back to crew
        </Link>
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
        {submittedCode}
      </pre>
      </div>
    </div>
  );
}
