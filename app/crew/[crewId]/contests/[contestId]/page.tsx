import { inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getContestResults } from "@/lib/contests";
import { SiteNav } from "@/components/site-nav";

export default async function ContestResultsPage({
  params,
}: {
  params: { crewId: string; contestId: string };
}) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const results = await getContestResults(session.user.id, params.crewId, params.contestId);
  if (!results) notFound();

  const memberUsers = results.rows.length
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, results.rows.map((r) => r.userId)))
    : [];
  const nameById = new Map(memberUsers.map((u) => [u.id, u.name ?? u.email]));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <SiteNav />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 28px" }}>
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

        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--fg)", margin: "0 0 6px" }}>
          {results.contest.name}
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "0 0 28px" }}>
          {results.problems.length} problem{results.problems.length !== 1 ? "s" : ""} &middot; who solved what,
          no ranking.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontWeight: 500 }}>
                  member
                </th>
                {results.problems.map((p) => (
                  <th
                    key={p.id}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderBottom: "1px solid var(--line)",
                      color: "var(--muted)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row) => (
                <tr key={row.userId}>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--line)", color: "var(--fg)" }}>
                    {nameById.get(row.userId) ?? "member"}
                  </td>
                  {row.solutions.map((sol, i) => (
                    <td key={results.problems[i].id} style={{ padding: "10px", borderBottom: "1px solid var(--line)" }}>
                      {sol.status === "not_started" && <span style={{ color: "var(--line)" }}>not started</span>}
                      {sol.status === "locked" && <span style={{ color: "var(--muted)" }}>locked</span>}
                      {sol.status === "visible" && (
                        <Link
                          href={`/crew/${params.crewId}/problems/${results.problems[i].id}/solutions/${row.userId}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: sol.verdict === "accepted" ? "var(--accent)" : "var(--fg)",
                          }}
                        >
                          {sol.verdict.replace(/_/g, " ")} <ArrowUpRight size={10} weight="bold" />
                        </Link>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
