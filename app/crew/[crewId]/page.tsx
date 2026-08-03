import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { requireSession, requireCrewMember, getUserCrews } from "@/lib/auth-helpers";
import { db } from "@/db";
import { crewMembers, crews, users, codeCheckpoints } from "@/db/schema";
import { getTodaysProblem, getWeeklyProblems } from "@/lib/problems";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
import { getActiveContest, getCrewContests } from "@/lib/contests";
import { PulseStrip } from "@/components/pulse-strip";
import { CrewSwitcher } from "@/components/crew-switcher";
import { LeaveCrewButton } from "@/components/leave-crew-button";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default async function CrewHomePage({ params }: { params: { crewId: string } }) {
  const session = await requireSession();
  const membership = await requireCrewMember(session.user.id, params.crewId);

  const [crew] = await db.select().from(crews).where(eq(crews.id, params.crewId)).limit(1);
  if (!crew) notFound();

  const members = await db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crewId, params.crewId));

  const userCrews = await getUserCrews(session.user.id);

  const activeContest = await getActiveContest(params.crewId);
  const pastContests = (await getCrewContests(params.crewId)).filter((c) => c.id !== activeContest?.id);

  const today = new Date().toISOString().slice(0, 10);
  const solvedToday = members.filter((m) => m.lastCompleted === today);

  const todaysProblem = await getTodaysProblem(params.crewId);
  const weeklyProblems = await getWeeklyProblems(params.crewId);
  const crewSolutions = (await getCrewSolutionsForProblem(session.user.id, params.crewId, todaysProblem.id)) ?? [];

  const initials = (session.user.name ?? session.user.email ?? "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Activity rows are keyed by userId only (crewSolutions), with no name —
  // join to `users` for display names so a multi-person crew's rows aren't
  // all indistinguishable. Falls back to email, matching the established
  // `session.user.name ?? session.user.email` pattern used for `initials`
  // above and for `userName` passed into room-client.tsx.
  const memberUsers = members.length
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, members.map((m) => m.userId)))
    : [];
  const nameById = new Map(memberUsers.map((u) => [u.id, u.name ?? u.email]));

  // Batch-fetch checkpoints for every visible row's submission in one query
  // (not one per row) to keep the crew log's Pulse Strips N+1-safe.
  const visibleSubmissionIds = crewSolutions
    .filter((row): row is Extract<typeof row, { status: "visible" }> => row.status === "visible")
    .map((row) => row.submissionId);

  const checkpointsBySubmission = new Map<string, { insertedChars: number; isPasteFlag: boolean }[]>();
  if (visibleSubmissionIds.length > 0) {
    const checkpointRows = await db
      .select({
        submissionId: codeCheckpoints.submissionId,
        insertedChars: codeCheckpoints.insertedChars,
        isPasteFlag: codeCheckpoints.isPasteFlag,
      })
      .from(codeCheckpoints)
      .where(inArray(codeCheckpoints.submissionId, visibleSubmissionIds))
      .orderBy(codeCheckpoints.createdAt);
    for (const row of checkpointRows) {
      if (!row.submissionId) continue;
      const list = checkpointsBySubmission.get(row.submissionId) ?? [];
      list.push({ insertedChars: row.insertedChars, isPasteFlag: row.isPasteFlag });
      checkpointsBySubmission.set(row.submissionId, list);
    }
  }

  const activity = crewSolutions.map((row) => {
    const displayName = nameById.get(row.userId) ?? "member";
    if (row.status === "not_started") {
      return { userId: row.userId, label: `${displayName} — not started`, link: null, checkpoints: null };
    }
    if (row.status === "locked") {
      return { userId: row.userId, label: `${displayName} — locked — submit today's problem to see this`, link: null, checkpoints: null };
    }
    const verb = row.verdict === "accepted" ? "solved" : "attempted";
    return {
      userId: row.userId,
      label: `${displayName} — ${verb} · ${getTimeAgo(new Date(row.submittedAt))}`,
      link: `/crew/${params.crewId}/problems/${todaysProblem.id}/solutions/${row.userId}`,
      checkpoints: checkpointsBySubmission.get(row.submissionId) ?? [],
    };
  });

  // Compute weekly progress
  const weeklyDone = Math.min(solvedToday.length, weeklyProblems.length);
  const weeklyTotal = weeklyProblems.length;
  const weeklyPct = weeklyTotal > 0 ? Math.round((weeklyDone / weeklyTotal) * 100) : 0;

  // Topic for weekly display
  const weeklyTopics = [...new Set(weeklyProblems.map((p) => p.topicTag))];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      <div style={{ width: 220, background: "var(--panel)", borderRight: "1px solid var(--line)", padding: "20px 14px", flexShrink: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <CrewSwitcher
            crews={userCrews.map((c) => ({ crewId: c.crewId, crewName: c.crewName, role: c.role }))}
            activeCrewId={crew.id}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          <div style={{ background: "var(--raise)", borderRadius: 6, padding: "6px 10px", color: "var(--fg)" }}>Today</div>
        </div>
        <Panel style={{ marginTop: 28, padding: 10 }}>
          <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10.5px", color: "var(--accent)", margin: "0 0 4px" }}>
            {crew.currentStreak}-day streak
          </p>
          <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0 }}>invite code {crew.inviteCode}</p>
        </Panel>
        <Link
          href="/crew/new"
          style={{
            display: "block",
            marginTop: 10,
            border: "1px dashed var(--line)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: "10.5px",
            letterSpacing: "0.06em",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          + join or create a crew
        </Link>
        <div style={{ marginTop: 10 }}>
          <LeaveCrewButton
            crewId={crew.id}
            crewName={crew.name}
            role={membership.role}
            otherMemberCount={members.length - 1}
          />
        </div>
        <span
          style={{
            display: "block",
            marginTop: 20,
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: "10.5px",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          {initials}
        </span>
      </div>

      <div style={{ flex: 1, padding: "28px 32px", maxWidth: 720 }}>
        {activeContest ? (
          <Panel style={{ marginBottom: 24, padding: "14px 16px", borderColor: "var(--accent)" }}>
            <p
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "9.5px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--accent)",
                margin: "0 0 6px",
              }}
            >
              contest live &middot; {activeContest.problems.length} problem{activeContest.problems.length !== 1 ? "s" : ""}
            </p>
            <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: 16, color: "var(--fg)", margin: "0 0 14px" }}>
              {activeContest.name}
            </p>
            <Button href={`/crew/${crew.id}/room`} size="sm" icon={<ArrowRight size={13} weight="bold" />} iconPosition="right">
              Open room
            </Button>
          </Panel>
        ) : (
          membership.role === "owner" && (
            <Link
              href={`/crew/${crew.id}/contests/new`}
              style={{
                display: "block",
                marginBottom: 24,
                border: "1px dashed var(--line)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: "11.5px",
                letterSpacing: "0.06em",
                color: "var(--muted)",
              }}
            >
              + start a contest
            </Link>
          )
        )}

        <Panel style={{ marginBottom: 24, padding: "14px 16px" }}>
          <p
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "9.5px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted)",
              margin: "0 0 6px",
            }}
          >
            today &middot; {members.length} in the crew &middot;{" "}
            <span style={{ color: "var(--accent)" }}>
              {solvedToday.length} of {members.length} solved
            </span>
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: 16, color: "var(--fg)", margin: "0 0 4px" }}>
            {todaysProblem.title}
          </p>
          <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10.5px", color: "var(--muted)", margin: "0 0 14px" }}>
            {todaysProblem.difficulty} &middot; {todaysProblem.topicTag}
          </p>
          <Button href={`/crew/${crew.id}/room`} size="sm" icon={<ArrowRight size={13} weight="bold" />} iconPosition="right">
            Open room
          </Button>
        </Panel>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 6px" }}>
            This week: {weeklyTopics.join(", ")} &middot; {weeklyDone} of {weeklyTotal} done
          </p>
          <div style={{ height: 3, background: "var(--line)", overflow: "hidden", borderRadius: 2 }}>
            <div style={{ width: `${weeklyPct}%`, height: "100%", background: "var(--accent)" }} />
          </div>
        </div>

        <p
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "9.5px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--muted)",
            margin: "0 0 8px",
          }}
        >
          crew log
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activity.map((a) => (
            <div
              key={a.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 4px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: 12,
                  color: "var(--fg)",
                  flex: 1,
                }}
              >
                {a.label}
              </span>
              {a.checkpoints && <PulseStrip checkpoints={a.checkpoints} />}
              {a.link && (
                <Link href={a.link} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10.5px", color: "var(--accent)" }}>
                  view <ArrowUpRight size={11} weight="bold" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {pastContests.length > 0 && (
          <>
            <p
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "9.5px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted)",
                margin: "28px 0 8px",
              }}
            >
              past contests
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pastContests.map((c) => (
                <Link
                  key={c.id}
                  href={`/crew/${crew.id}/contests/${c.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 4px",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 12,
                    color: "var(--fg)",
                  }}
                >
                  {c.name}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10.5px", color: "var(--accent)" }}>
                    results <ArrowUpRight size={11} weight="bold" />
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
