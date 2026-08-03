"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Problem } from "@/lib/problems";

export const LANGUAGES = ["Python 3", "C++ 17", "Java 17"];
export const LANG_KEY: Record<string, string> = {
  "Python 3": "python",
  "C++ 17": "cpp",
  "Java 17": "java",
};

export type DocTab = "Problem" | "Hints" | "Submissions";
export type RunStatus = "idle" | "running" | "submitting";

export interface TestResult {
  case: number;
  input: string;
  expected: string;
  got: string;
  passed: boolean;
}

export interface SubmissionRecord {
  id: string;
  verdict: string;
  runtime: number | null;
  submittedAt: string;
}

interface UseProblemWorkspaceArgs {
  problem: Problem;
  /** Absent for solo practice (outside any crew). */
  crewId?: string;
  /** Set only when the crew has an active contest and this problem is part of it. */
  contestId?: string;
  previousSubmissions: SubmissionRecord[];
  /** PartyKit presence status — no-op when absent (solo practice has no room). */
  onStatusChange?: (status: "idle" | "coding" | "solved") => void;
}

/**
 * Owns the run/submit/hint/editor state and handlers shared by the crew
 * room and solo practice — extracted so this ~150-line state machine has
 * exactly one implementation instead of being duplicated verbatim across
 * both call sites.
 */
export function useProblemWorkspace({
  problem,
  crewId,
  contestId,
  previousSubmissions,
  onStatusChange,
}: UseProblemWorkspaceArgs) {
  const [docTab, setDocTab] = useState<DocTab>("Problem");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(problem.starterCode[LANG_KEY[LANGUAGES[0]]] ?? "");
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [submitResults, setSubmitResults] = useState<TestResult[] | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [caseIdx, setCaseIdx] = useState(0);
  const [subs, setSubs] = useState<SubmissionRecord[]>(previousSubmissions);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintLocked, setHintLocked] = useState<number | null>(null);

  const codeChangeTimeout = useRef<ReturnType<typeof setTimeout>>();
  const checkpointTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastCheckpointCodeRef = useRef(code);

  // `problem` can change without unmounting this hook's owner (contest mode
  // navigates between problems via a `?p=` query param on the same route),
  // so the per-problem state seeded once into useState above must be reset
  // explicitly whenever the problem actually changes.
  const problemId = problem.id;
  useEffect(() => {
    setDocTab("Problem");
    setLanguage(LANGUAGES[0]);
    setCode(problem.starterCode[LANG_KEY[LANGUAGES[0]]] ?? "");
    setRunStatus("idle");
    setRunOutput(null);
    setSubmitResults(null);
    setVerdict(null);
    setRuntime(null);
    setCaseIdx(0);
    setSubs(previousSubmissions);
    setHint(null);
    setHintLoading(false);
    setHintLocked(null);
    lastCheckpointCodeRef.current = "";
    // Only re-run when the problem identity changes — `previousSubmissions`
    // and `problem` (object identity) are intentionally excluded so a parent
    // re-render with the same problem doesn't wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const postCheckpoint = useCallback(
    async (snapshotCode: string) => {
      if (snapshotCode === lastCheckpointCodeRef.current) return;
      try {
        const res = await fetch("/api/checkpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: problem.id,
            crewId: crewId ?? null,
            code: snapshotCode,
            language: LANG_KEY[language] ?? "python",
          }),
        });
        if (res.ok) {
          lastCheckpointCodeRef.current = snapshotCode;
        }
      } catch {
        // Best-effort: a missed checkpoint is a gap in the timeline, not a broken submit flow.
        // Leave lastCheckpointCodeRef untouched so the next attempt retries this code.
      }
    },
    [problem.id, crewId, language],
  );

  const testCases = problem.testCases ?? [];
  const activeCase = testCases[caseIdx] ?? { input: "", expected: "" };

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      setLanguage(newLang);
      const key = LANG_KEY[newLang] ?? "python";
      setCode(problem.starterCode[key] ?? "");
    },
    [problem.starterCode],
  );

  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      onStatusChange?.("coding");
      clearTimeout(codeChangeTimeout.current);
      codeChangeTimeout.current = setTimeout(() => {
        onStatusChange?.("idle");
      }, 30000); // go idle after 30s of no changes

      clearTimeout(checkpointTimeout.current);
      checkpointTimeout.current = setTimeout(() => {
        postCheckpoint(val);
      }, 25000); // one checkpoint per ~25s of active typing
    },
    [onStatusChange, postCheckpoint],
  );

  const handleReset = useCallback(() => {
    clearTimeout(checkpointTimeout.current);
    const key = LANG_KEY[language] ?? "python";
    setCode(problem.starterCode[key] ?? "");
    setRunOutput(null);
    setSubmitResults(null);
    setVerdict(null);
  }, [language, problem.starterCode]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  // ---- Run (single test case) ----
  const handleRun = useCallback(async () => {
    setRunStatus("running");
    setRunOutput(null);
    try {
      postCheckpoint(code);
      const res = await fetch("/api/judge0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: LANG_KEY[language] ?? "python",
          stdin: activeCase.input,
          problemId: problem.id,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setRunOutput(`Error: ${data.error}`);
      } else {
        const output = [
          data.stdout && `stdout:\n${data.stdout}`,
          data.stderr && `stderr:\n${data.stderr}`,
          data.compile_output && `compile:\n${data.compile_output}`,
          `status: ${data.status?.description ?? "Unknown"}`,
          data.time && `time: ${data.time}s`,
        ]
          .filter(Boolean)
          .join("\n\n");
        setRunOutput(output);
      }
    } catch (err) {
      setRunOutput(`Network error: ${(err as Error).message}`);
    } finally {
      setRunStatus("idle");
    }
  }, [code, language, activeCase, postCheckpoint, problem.id]);

  // ---- Submit (all test cases) ----
  const handleSubmit = useCallback(async () => {
    setRunStatus("submitting");
    setSubmitResults(null);
    setVerdict(null);
    setRuntime(null);
    try {
      postCheckpoint(code);
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          crewId: crewId ?? null,
          contestId: contestId ?? null,
          code,
          language: LANG_KEY[language] ?? "python",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setVerdict("error");
        setRunOutput(`Error: ${data.error}`);
      } else {
        setSubmitResults(data.results ?? []);
        setVerdict(data.verdict);
        setRuntime(data.runtime);
        setSubs((prev) => [
          {
            id: data.submissionId ?? crypto.randomUUID(),
            verdict: data.verdict,
            runtime: data.runtime,
            submittedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        if (data.verdict === "accepted") {
          onStatusChange?.("solved");
        }
      }
    } catch (err) {
      setVerdict("error");
      setRunOutput(`Network error: ${(err as Error).message}`);
    } finally {
      setRunStatus("idle");
    }
  }, [code, language, problem.id, crewId, contestId, postCheckpoint, onStatusChange]);

  // ---- Hints ----
  const handleRequestHint = useCallback(async () => {
    setHintLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          crewId: crewId ?? null,
          code,
          language: LANG_KEY[language] ?? "python",
        }),
      });
      const data = await res.json();
      if (data.locked) {
        setHintLocked(data.attemptsNeeded);
      } else {
        setHint(data.hint);
        setHintLocked(null);
      }
    } catch {
      setHint("Could not load hint. Try again later.");
    } finally {
      setHintLoading(false);
    }
  }, [problem.id, crewId, code, language]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          handleSubmit();
        } else {
          handleRun();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRun, handleSubmit]);

  const failedCount = subs.filter((s) => s.verdict !== "accepted").length;

  return {
    docTab,
    setDocTab,
    language,
    code,
    handleLanguageChange,
    handleCodeChange,
    handleReset,
    handleCopy,
    runStatus,
    runOutput,
    submitResults,
    verdict,
    runtime,
    caseIdx,
    setCaseIdx,
    testCases,
    activeCase,
    handleRun,
    handleSubmit,
    subs,
    failedCount,
    hint,
    hintLoading,
    hintLocked,
    handleRequestHint,
  };
}
