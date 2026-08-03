import Link from "next/link";
import { requireSession } from "@/lib/auth-helpers";
import { listProblems } from "@/lib/problems";
import { SiteNav } from "@/components/site-nav";
import { ProblemFilters } from "@/components/practice/problem-filters";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "var(--accent)",
  medium: "var(--fg)",
  hard: "#e06060",
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: { topic?: string; difficulty?: "easy" | "medium" | "hard" };
}) {
  await requireSession();

  const allProblems = await listProblems();
  const topics = [...new Set(allProblems.map((p) => p.topicTag))].sort();

  const filtered = allProblems.filter((p) => {
    if (searchParams.topic && p.topicTag !== searchParams.topic) return false;
    if (searchParams.difficulty && p.difficulty !== searchParams.difficulty) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <SiteNav />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 28px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
            margin: "0 0 8px",
          }}
        >
          Practice solo
        </h1>
        <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.6 }}>
          Any problem, any time, no crew required.
        </p>

        <ProblemFilters topics={topics} />

        {filtered.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>No problems match those filters.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/practice/${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "13px 4px",
                borderBottom: "1px solid var(--line)",
                fontSize: "12.5px",
              }}
            >
              <span style={{ color: "var(--fg)" }}>{p.title}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  {p.topicTag}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: DIFFICULTY_COLOR[p.difficulty] ?? "var(--muted)",
                    width: 52,
                  }}
                >
                  {p.difficulty}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
