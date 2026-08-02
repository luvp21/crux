import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { PlusMarks } from "@/components/plus-marks";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";
import { getTodaysProblem, getWeeklyProblems, getCrewActivity } from "@/lib/problems";

export default async function CrewHomePage({ params }: { params: { crewId: string } }) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const [crew] = await db.select().from(crews).where(eq(crews.id, params.crewId)).limit(1);
  if (!crew) notFound();

  const members = await db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crewId, params.crewId));

  const today = new Date().toISOString().slice(0, 10);
  const solvedToday = members.filter((m) => m.lastCompleted === today);

  const todaysProblem = await getTodaysProblem(params.crewId);
  const weeklyProblems = await getWeeklyProblems(params.crewId);
  const recentActivity = await getCrewActivity(params.crewId);

  const initials = (session.user.name ?? session.user.email ?? "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Build activity feed from real data (fallback to static if none)
  const activity = recentActivity.length > 0
    ? recentActivity.slice(0, 8).map((sub) => ({
        who: "member",
        what: `${sub.verdict === "accepted" ? "solved" : "attempted"} a problem`,
        when: getTimeAgo(sub.submittedAt),
      }))
    : [
        { who: "crew", what: "waiting for first submission", when: "today" },
      ];

  // Compute weekly progress
  const weeklyDone = Math.min(solvedToday.length, weeklyProblems.length);
  const weeklyTotal = weeklyProblems.length;
  const weeklyPct = weeklyTotal > 0 ? Math.round((weeklyDone / weeklyTotal) * 100) : 0;

  // Topic for weekly display
  const weeklyTopics = [...new Set(weeklyProblems.map((p) => p.topicTag))];

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            position: "relative",
            maxWidth: 1000,
            margin: "0 auto",
            borderLeft: "1px solid var(--line)",
            borderRight: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
            padding: "0 28px",
          }}
        >
          <PlusMarks corners={["top-left", "top-right", "bottom-left", "bottom-right"]} />
          <div
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "0.02em",
              fontVariationSettings: "'wdth' 70",
            }}
          >
            CRUX
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ThemeToggle style={{ padding: "7px 11px" }} />
            <span
              style={{
                border: "1px solid var(--line)",
                padding: "7px 10px",
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                color: "var(--muted)",
              }}
            >
              {initials}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 1000,
          margin: "0 auto",
          borderLeft: "1px solid var(--line)",
          borderRight: "1px solid var(--line)",
          padding: "0 28px",
          minHeight: "calc(100vh - 108px)",
        }}
      >
        <PlusMarks corners={["bottom-left", "bottom-right"]} />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "44px 0 32px",
            animation: "up 500ms ease both",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10.5px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 14,
              }}
            >
              crew.home // {members.length} nodes &middot; code {crew.inviteCode}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontVariationSettings: "'wdth' 70",
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {crew.name}
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontVariationSettings: "'wdth' 70",
                fontWeight: 800,
                fontSize: 40,
                lineHeight: 1,
                color: "var(--accent)",
              }}
            >
              {crew.currentStreak}
            </div>
            <div
              style={{
                fontSize: "10.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginTop: 6,
              }}
            >
              day streak
            </div>
          </div>
        </div>

        {/* ---- Challenge cards ---- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            border: "1px solid var(--line)",
            animation: "up 500ms ease 80ms both",
          }}
        >
          {/* Today's challenge */}
          <div style={{ padding: 24, borderRight: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)" }}>
                today
              </span>
              <span style={{ fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
                {todaysProblem.difficulty}
              </span>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontVariationSettings: "'wdth' 70",
                fontWeight: 700,
                fontSize: 23,
                lineHeight: 1.1,
                textTransform: "uppercase",
                margin: "0 0 14px",
              }}
            >
              {todaysProblem.title}
            </h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
              {todaysProblem.topicTag.split(",").map((t) => (
                <span
                  key={t}
                  style={{
                    border: "1px solid var(--line)",
                    padding: "4px 9px",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  {t.trim()}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {solvedToday.slice(0, 3).map((m, i) => (
                  <span
                    key={i}
                    style={{
                      border: "1px solid var(--line)",
                      padding: "5px 7px",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--accent)",
                    }}
                  >
                    ✓
                  </span>
                ))}
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {solvedToday.length} of {members.length} solved
                </span>
              </div>
              <Link
                href={`/crew/${crew.id}/room`}
                style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)" }}
              >
                Open &rarr;
              </Link>
            </div>
          </div>

          {/* This week */}
          <div style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
              this week
            </span>
            <h3
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontVariationSettings: "'wdth' 70",
                fontWeight: 700,
                fontSize: 19,
                textTransform: "uppercase",
                margin: "0 0 10px",
              }}
            >
              {weeklyTopics.join(", ")}: {weeklyTotal} problems
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 auto", lineHeight: 1.65 }}>
              {weeklyProblems.map((p) => p.title).slice(0, 2).join(", ")}
              {weeklyProblems.length > 2 ? ` +${weeklyProblems.length - 2} more` : ""}. Ends Sunday.
            </p>
            <div style={{ marginTop: 24 }}>
              <div style={{ height: 3, background: "var(--line)", overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${weeklyPct}%`, height: "100%", background: "var(--accent)" }} />
              </div>
              <div style={{ fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                {weeklyDone} of {weeklyTotal} done
              </div>
            </div>
          </div>
        </div>

        {/* ---- Start live session ---- */}
        <div style={{ padding: "18px 0 34px", animation: "up 500ms ease 160ms both" }}>
          <Link
            href={`/crew/${crew.id}/room`}
            style={{
              display: "block",
              textAlign: "center",
              width: "100%",
              background: "var(--accent)",
              color: "var(--accent-fg)",
              border: "none",
              padding: 17,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Start live session
          </Link>
        </div>

        {/* ---- Activity feed ---- */}
        <div style={{ position: "relative", borderTop: "1px solid var(--line)", animation: "fade 600ms ease 240ms both" }}>
          <PlusMarks corners={["top-left", "top-right"]} offset={-28} />
          <div style={{ fontSize: "10.5px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)", padding: "22px 0 10px" }}>
            activity.log
          </div>
          {activity.map((a, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "13px 0", borderTop: "1px solid var(--line)" }}
            >
              <span style={{ fontSize: "10.5px", color: "var(--accent)", width: 74, flex: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {a.who}
              </span>
              <span style={{ fontSize: "12.5px", lineHeight: 1.5, flex: 1, color: "var(--fg)" }}>{a.what}</span>
              <span style={{ fontSize: "10.5px", color: "var(--muted)", whiteSpace: "nowrap", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {a.when}
              </span>
            </div>
          ))}
        </div>
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
