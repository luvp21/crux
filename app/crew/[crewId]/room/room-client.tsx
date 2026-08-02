"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Problem } from "@/lib/problems";
import { usePartyRoom } from "@/lib/partykit";

// Lazy-load Monaco to avoid SSR issues
const CodeEditor = dynamic(
  () => import("@/components/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        loading editor...
      </div>
    ),
  },
);

const LANGUAGES = ["Python 3", "C++ 17", "Java 17"];
const LANG_KEY: Record<string, string> = {
  "Python 3": "python",
  "C++ 17": "cpp",
  "Java 17": "java",
};

type DocTab = "Problem" | "Hints" | "Submissions";
type RunStatus = "idle" | "running" | "submitting";

interface TestResult {
  case: number;
  input: string;
  expected: string;
  got: string;
  passed: boolean;
}

interface SubmissionRecord {
  id: string;
  verdict: string;
  runtime: number | null;
  submittedAt: string;
}

export function RoomClient({
  crewId,
  crewName,
  streak,
  problem,
  memberCount,
  userId,
  userName,
  previousSubmissions,
}: {
  crewId: string;
  crewName: string;
  streak: number;
  problem: Problem;
  memberCount: number;
  userId: string;
  userName: string;
  previousSubmissions: SubmissionRecord[];
}) {
  const [docTab, setDocTab] = useState<DocTab>("Problem");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(
    problem.starterCode[LANG_KEY[LANGUAGES[0]]] ?? "",
  );
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
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PartyKit live presence + chat
  const { members: partyMembers, chat: partyChat, connected, sendChat, updateStatus } = usePartyRoom(
    crewId,
    userId,
    userName,
  );
  const codeChangeTimeout = useRef<ReturnType<typeof setTimeout>>();
  const checkpointTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastCheckpointCodeRef = useRef(code);

  const postCheckpoint = useCallback(
    async (snapshotCode: string) => {
      if (snapshotCode === lastCheckpointCodeRef.current) return;
      try {
        const res = await fetch("/api/checkpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: problem.id,
            crewId,
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

  // Switch language → update starter code
  const handleLanguageChange = useCallback(
    (newLang: string) => {
      setLanguage(newLang);
      const key = LANG_KEY[newLang] ?? "python";
      setCode(problem.starterCode[key] ?? "");
    },
    [problem.starterCode],
  );

  // Track code changes for status updates
  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      updateStatus("coding");
      clearTimeout(codeChangeTimeout.current);
      codeChangeTimeout.current = setTimeout(() => {
        updateStatus("idle");
      }, 30000); // go idle after 30s of no changes

      clearTimeout(checkpointTimeout.current);
      checkpointTimeout.current = setTimeout(() => {
        postCheckpoint(val);
      }, 25000); // one checkpoint per ~25s of active typing
    },
    [updateStatus, postCheckpoint],
  );

  // Reset code
  const handleReset = useCallback(() => {
    clearTimeout(checkpointTimeout.current);
    const key = LANG_KEY[language] ?? "python";
    setCode(problem.starterCode[key] ?? "");
    setRunOutput(null);
    setSubmitResults(null);
    setVerdict(null);
  }, [language, problem.starterCode]);

  // Copy code
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
  }, [code, language, activeCase, postCheckpoint]);

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
          crewId,
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
        // Add to submissions list
        setSubs((prev) => [
          {
            id: data.submissionId ?? crypto.randomUUID(),
            verdict: data.verdict,
            runtime: data.runtime,
            submittedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        // Update PartyKit status
        if (data.verdict === "accepted") {
          updateStatus("solved");
        }
      }
    } catch (err) {
      setVerdict("error");
      setRunOutput(`Network error: ${(err as Error).message}`);
    } finally {
      setRunStatus("idle");
    }
  }, [code, language, problem.id, crewId, postCheckpoint]);

  // ---- Hints ----
  const handleRequestHint = useCallback(async () => {
    setHintLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          crewId,
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

  // ---- Chat (via PartyKit) ----
  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatInput("");
  }, [chatInput, sendChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [partyChat]);

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

  const verdictColor =
    verdict === "accepted"
      ? "var(--accent)"
      : verdict === "error"
        ? "var(--muted)"
        : "#e06060";

  const failedCount = subs.filter((s) => s.verdict !== "accepted").length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ---- Top bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          height: 48,
          borderBottom: "1px solid var(--line)",
          flex: "none",
          background: "var(--panel)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <Link href={`/crew/${crewId}`} style={{ color: "var(--muted)" }}>
            &larr; crew
          </Link>
          <span style={{ fontWeight: 700 }}>{crewName}</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--accent)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            live
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--accent)" }}>streak {streak}</span>
          <ThemeToggle style={{ padding: "6px 10px", fontSize: 10 }} />
        </div>
      </div>

      {/* ---- Main 3-column layout ---- */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(240px, 372px) minmax(0, 1fr) minmax(0, 252px)",
          minHeight: 0,
        }}
      >
        {/* ---- Left panel: Problem / Hints / Submissions ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            borderRight: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              height: 40,
              borderBottom: "1px solid var(--line)",
              flex: "none",
            }}
          >
            {(["Problem", "Hints", "Submissions"] as DocTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setDocTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  borderRight: "1px solid var(--line)",
                  borderBottom: `2px solid ${docTab === t ? "var(--accent)" : "transparent"}`,
                  padding: "0 16px",
                  fontSize: "10.5px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: docTab === t ? "var(--fg)" : "var(--muted)",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "22px 20px" }}>
            {/* ---- Problem tab ---- */}
            {docTab === "Problem" && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    marginBottom: 12,
                  }}
                >
                  today // {problem.difficulty}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-archivo), sans-serif",
                    fontVariationSettings: "'wdth' 70",
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    margin: "0 0 18px",
                  }}
                >
                  {problem.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 22,
                  }}
                >
                  {problem.topicTag.split(",").map((t) => (
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
                <p
                  style={{
                    fontSize: "12.5px",
                    lineHeight: 1.75,
                    margin: "0 0 26px",
                    color: "var(--fg)",
                  }}
                >
                  {problem.description}
                </p>
                {problem.examples.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 18,
                      border: "1px solid var(--line)",
                      background: "var(--panel)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        padding: "9px 14px",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      example {i + 1}
                    </div>
                    <div
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        lineHeight: 1.9,
                        color: "var(--muted)",
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--accent)" }}>input</span>{" "}
                        {ex.input}
                      </div>
                      <div>
                        <span style={{ color: "var(--accent)" }}>output</span>{" "}
                        {ex.output}
                      </div>
                      {ex.explanation && <div>{ex.explanation}</div>}
                    </div>
                  </div>
                ))}
                {problem.constraints && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "var(--muted)",
                      lineHeight: 1.7,
                      borderTop: "1px solid var(--line)",
                      paddingTop: 16,
                    }}
                  >
                    constraints: {problem.constraints}
                  </div>
                )}
              </div>
            )}

            {/* ---- Hints tab ---- */}
            {docTab === "Hints" && (
              <div>
                <p
                  style={{
                    fontSize: "11.5px",
                    color: "var(--muted)",
                    margin: "0 0 18px",
                    lineHeight: 1.7,
                  }}
                >
                  Hints unlock after {3} failed submissions. Opening one tells
                  your crew you used it.
                </p>
                {hintLocked !== null && (
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      padding: "18px 16px",
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 16,
                    }}
                  >
                    🔒 Submit {hintLocked} more time
                    {hintLocked > 1 ? "s" : ""} to unlock AI hints
                  </div>
                )}
                {hint && (
                  <div
                    style={{
                      border: "1px solid var(--accent)",
                      padding: "18px 16px",
                      fontSize: "12.5px",
                      lineHeight: 1.65,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        marginBottom: 10,
                      }}
                    >
                      hint
                    </div>
                    {hint}
                  </div>
                )}
                <button
                  onClick={handleRequestHint}
                  disabled={hintLoading}
                  style={{
                    background: "none",
                    border: "1px solid var(--line)",
                    color: "var(--fg)",
                    padding: "12px 20px",
                    fontSize: "11.5px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: hintLoading ? "wait" : "pointer",
                    opacity: hintLoading ? 0.6 : 1,
                    width: "100%",
                  }}
                >
                  {hintLoading
                    ? "thinking..."
                    : hint
                      ? "Get another hint"
                      : "Request hint"}
                </button>
                {failedCount > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 11,
                      color: "var(--muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {failedCount} failed attempt{failedCount > 1 ? "s" : ""} so
                    far
                  </div>
                )}
              </div>
            )}

            {/* ---- Submissions tab ---- */}
            {docTab === "Submissions" && (
              <div>
                {subs.length === 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    No submissions yet. Write your solution and hit submit.
                  </p>
                )}
                {subs.map((sub, i) => {
                  const isAccepted = sub.verdict === "accepted";
                  const timeAgo = getTimeAgo(sub.submittedAt);
                  return (
                    <div
                      key={sub.id ?? i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "14px 0",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          flex: "none",
                          background: isAccepted
                            ? "var(--accent)"
                            : "var(--muted)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11.5px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          flex: 1,
                          color: isAccepted ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        {sub.verdict.replace(/_/g, " ")}
                      </span>
                      {sub.runtime != null && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {sub.runtime} ms
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {timeAgo}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 20px",
              borderTop: "1px solid var(--line)",
              fontSize: "10.5px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            <span>{subs.length} submission{subs.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 10 }}>ctrl+enter: run · ctrl+shift+enter: submit</span>
          </div>
        </div>

        {/* ---- Center panel: Editor ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {/* Editor toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              height: 40,
              borderBottom: "1px solid var(--line)",
              flex: "none",
              paddingRight: 14,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                height: "100%",
                minWidth: 0,
                overflowX: "auto",
                overflowY: "hidden",
                flexWrap: "nowrap",
              }}
            >
              <button
                style={{
                  border: "none",
                  borderRight: "1px solid var(--line)",
                  padding: "0 16px",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flex: "none",
                  background: "var(--panel)",
                  color: "var(--fg)",
                }}
              >
                solution.{LANG_KEY[language] === "python" ? "py" : LANG_KEY[language] === "cpp" ? "cpp" : "java"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
                flex: "none",
              }}
            >
              <button
                onClick={handleReset}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                reset
              </button>
              <button
                onClick={handleCopy}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                copy
              </button>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  color: "var(--fg)",
                  fontSize: 11,
                  padding: "6px 8px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monaco editor */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
            />
          </div>

          {/* ---- Test case panel ---- */}
          <div
            style={{
              flex: "none",
              borderTop: "1px solid var(--line)",
              background: "var(--panel)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 16px 0",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  minWidth: 0,
                  overflowX: "auto",
                  overflowY: "hidden",
                  flexWrap: "nowrap",
                }}
              >
                {testCases.map((c, i) => {
                  const result = submitResults?.[i];
                  const dotColor = result
                    ? result.passed
                      ? "var(--accent)"
                      : "#e06060"
                    : "var(--muted)";
                  return (
                    <button
                      key={i}
                      onClick={() => setCaseIdx(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        background: "none",
                        border: `1px solid ${caseIdx === i ? "var(--accent)" : "var(--line)"}`,
                        padding: "6px 11px",
                        fontSize: "10.5px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flex: "none",
                        color:
                          caseIdx === i ? "var(--fg)" : "var(--muted)",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          background: dotColor,
                        }}
                      />
                      Case {i + 1}
                    </button>
                  );
                })}
              </div>
              {verdict && (
                <span
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: verdictColor,
                    whiteSpace: "nowrap",
                    flex: "none",
                  }}
                >
                  {verdict.replace(/_/g, " ")}
                  {runtime != null ? ` · ${runtime} ms` : ""}
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: 16,
                gap: 20,
                fontSize: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  input
                </div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {activeCase.input}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  expected
                </div>
                <div>{activeCase.expected}</div>
              </div>
              <div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  your output
                </div>
                <div
                  style={{
                    color: submitResults?.[caseIdx]
                      ? submitResults[caseIdx].passed
                        ? "var(--accent)"
                        : "#e06060"
                      : "var(--muted)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {submitResults?.[caseIdx]?.got ??
                    runOutput ??
                    "—"}
                </div>
              </div>
            </div>
          </div>

          {/* ---- Bottom bar: Run + Submit ---- */}
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {runStatus === "running"
                ? "running..."
                : runStatus === "submitting"
                  ? "submitting..."
                  : "autosaved · crew sees your cursor"}
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <button
                onClick={handleRun}
                disabled={runStatus !== "idle"}
                style={{
                  background: "none",
                  border: "1px solid var(--line)",
                  color: "var(--fg)",
                  padding: "10px 20px",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor:
                    runStatus !== "idle" ? "wait" : "pointer",
                  opacity: runStatus !== "idle" ? 0.6 : 1,
                }}
              >
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={runStatus !== "idle"}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  border: "none",
                  padding: "10px 24px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor:
                    runStatus !== "idle" ? "wait" : "pointer",
                  opacity: runStatus !== "idle" ? 0.6 : 1,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* ---- Right panel: Crew status + Chat ---- */}
        <div
          style={{
            borderLeft: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 16px", flex: "none" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--muted)",
                paddingBottom: 12,
              }}
            >
              crew.status · {memberCount} members
            </div>
            {partyMembers.map((m) => {
              const dotColor = m.status === "solved" ? "var(--accent)" : m.status === "coding" ? "var(--fg)" : "var(--line)";
              return (
                <div
                  key={m.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      flex: "none",
                      background: dotColor,
                    }}
                  />
                  <span style={{ fontSize: 12, flex: 1 }}>{m.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {m.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              padding: "0 16px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--muted)",
                padding: "14px 0 12px",
              }}
            >
              crew.chat
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                borderTop: "1px solid var(--line)",
                paddingTop: 14,
              }}
            >
              <div style={{ display: "grid", gap: 12, paddingBottom: 14 }}>
                {partyChat.length === 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    No messages yet. Say hi to your crew.
                  </div>
                )}
                {partyChat.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.6 }}>
                    <span style={{ color: "var(--accent)" }}>{c.name}</span>{" "}
                    {c.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>

          <div style={{ padding: "0 16px 16px", flex: "none" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
            >
              <input
                type="text"
                placeholder="message crew"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  padding: "10px 11px",
                  fontSize: 12,
                  color: "var(--fg)",
                  outline: "none",
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Helpers ----

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
