"use client";

import { useRouter, useSearchParams } from "next/navigation";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function ProblemFilters({ topics }: { topics: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";

  function updateParam(key: "topic" | "difficulty", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/practice?${params.toString()}`);
  }

  const selectStyle = {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    color: "var(--fg)",
    fontSize: 12,
    padding: "8px 10px",
    cursor: "pointer",
    outline: "none",
  } as const;

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <select value={topic} onChange={(e) => updateParam("topic", e.target.value)} style={selectStyle}>
        <option value="">all topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select value={difficulty} onChange={(e) => updateParam("difficulty", e.target.value)} style={selectStyle}>
        <option value="">all difficulties</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
