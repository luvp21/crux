"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProblemSummary } from "@/lib/problems";
import { Button } from "@/components/ui/button";

const DURATIONS = [
  { label: "30 min", minutes: 30 },
  { label: "60 min", minutes: 60 },
  { label: "90 min", minutes: 90 },
  { label: "120 min", minutes: 120 },
];

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const selectStyle = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  color: "var(--fg)",
  fontSize: 12,
  padding: "8px 10px",
  cursor: "pointer",
  outline: "none",
} as const;

export function ContestForm({ crewId, problems }: { crewId: string; problems: ProblemSummary[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "auto">("auto");
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoCount, setAutoCount] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topics = useMemo(() => [...new Set(problems.map((p) => p.topicTag))].sort(), [problems]);
  const filteredProblems = useMemo(
    () =>
      problems.filter((p) => {
        if (topicFilter && p.topicTag !== topicFilter) return false;
        if (difficultyFilter && p.difficulty !== difficultyFilter) return false;
        return true;
      }),
    [problems, topicFilter, difficultyFilter],
  );

  function toggleProblem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "manual"
          ? { name, mode, problemIds: [...selectedIds], durationMinutes }
          : {
              name,
              mode,
              count: autoCount,
              topicTag: topicFilter || null,
              difficulty: (difficultyFilter as "easy" | "medium" | "hard") || null,
              durationMinutes,
            };

      const res = await fetch(`/api/crew/${crewId}/contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start the contest");
        setSubmitting(false);
        return;
      }
      router.push(`/crew/${crewId}/room`);
    } catch {
      setError("Network error, try again");
      setSubmitting(false);
    }
  }

  const canSubmit = mode === "auto" ? autoCount > 0 : selectedIds.size > 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Button variant={mode === "auto" ? "filled" : "outline"} size="sm" onClick={() => setMode("auto")}>
          Auto-select
        </Button>
        <Button variant={mode === "manual" ? "filled" : "outline"} size="sm" onClick={() => setMode("manual")}>
          Pick problems
        </Button>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="contest name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line)",
            padding: "10px 12px",
            fontSize: 12.5,
            color: "var(--fg)",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} style={selectStyle}>
            <option value="">any topic</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} style={selectStyle}>
            <option value="">any difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {mode === "auto" && (
            <select value={autoCount} onChange={(e) => setAutoCount(Number(e.target.value))} style={selectStyle}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} problem{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          )}
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            style={selectStyle}
          >
            {DURATIONS.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "manual" && (
        <div style={{ border: "1px solid var(--line)", maxHeight: 360, overflow: "auto", marginBottom: 20 }}>
          {filteredProblems.map((p) => (
            <label
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleProblem(p.id)} />
              <span style={{ flex: 1, color: "var(--fg)" }}>{p.title}</span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                {p.difficulty}
              </span>
            </label>
          ))}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#e06060", marginBottom: 16 }}>{error}</p>
      )}

      <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
        {submitting ? "Starting..." : "Start contest"}
      </Button>
    </div>
  );
}
