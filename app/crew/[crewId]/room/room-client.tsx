"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Lock } from "@phosphor-icons/react";
import type { Problem, ProblemSummary } from "@/lib/problems";
import { usePartyRoom } from "@/lib/partykit";
import { Button } from "@/components/ui/button";
import { CrewSwitcher, type CrewSwitcherCrew } from "@/components/crew-switcher";
import {
  useProblemWorkspace,
  LANGUAGES,
  LANG_KEY,
  type DocTab,
  type SubmissionRecord,
} from "@/lib/hooks/use-problem-workspace";

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

interface CrewSolutionEntry {
  userId: string;
  status: "not_started" | "locked" | "visible";
  link: string | null;
}

interface ContestInfo {
  id: string;
  name: string;
  endAt: string;
  problems: ProblemSummary[];
}

function useCountdown(endAt: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!endAt) {
      setLabel(null);
      return;
    }
    const end = new Date(endAt).getTime();
    function tick() {
      const remainingMs = end - Date.now();
      if (remainingMs <= 0) {
        setLabel("ended");
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setLabel(`${mins}:${secs.toString().padStart(2, "0")} left`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return label;
}

export function RoomClient({
  crewId,
  streak,
  problem,
  memberCount,
  userId,
  userName,
  previousSubmissions,
  crewSolutions,
  userCrews,
  contest,
  activeProblemId,
}: {
  crewId: string;
  streak: number;
  problem: Problem;
  memberCount: number;
  userId: string;
  userName: string;
  previousSubmissions: SubmissionRecord[];
  crewSolutions: CrewSolutionEntry[];
  userCrews: CrewSwitcherCrew[];
  contest: ContestInfo | null;
  activeProblemId: string;
}) {
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PartyKit live presence + chat
  const { members: partyMembers, chat: partyChat, sendChat, updateStatus } = usePartyRoom(
    crewId,
    userId,
    userName,
  );

  const {
    docTab,
    setDocTab,
    language,
    handleLanguageChange,
    handleCodeChange,
    handleReset,
    handleCopy,
    code,
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
  } = useProblemWorkspace({ problem, crewId, contestId: contest?.id, previousSubmissions, onStatusChange: updateStatus });

  const contestCountdown = useCountdown(contest?.endAt);

  // ---- Chat (via PartyKit) ----
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [partyChat]);

  const verdictColor =
    verdict === "accepted"
      ? "var(--accent)"
      : verdict === "error"
        ? "var(--muted)"
        : "#e06060";

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
          <Button
            href={`/crew/${crewId}`}
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} weight="bold" />}
            style={{ padding: 0, letterSpacing: "0.14em", fontSize: "10.5px" }}
          >
            Exit room
          </Button>
          <CrewSwitcher
            crews={userCrews}
            activeCrewId={crewId}
            triggerStyle={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.14em" }}
          />
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
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {contest ? (
            <span style={{ color: "var(--accent)" }}>
              {contest.name} &middot; {contestCountdown}
            </span>
          ) : (
            <span style={{ color: "var(--accent)" }}>streak {streak}</span>
          )}
        </div>
      </div>

      {/* ---- Contest problem strip ---- */}
      {contest && contest.problems.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            borderBottom: "1px solid var(--line)",
            background: "var(--panel)",
            flex: "none",
            overflowX: "auto",
          }}
        >
          {contest.problems.map((p, i) => (
            <Link
              key={p.id}
              href={`/crew/${crewId}/room?p=${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${activeProblemId === p.id ? "var(--accent)" : "var(--line)"}`,
                padding: "6px 11px",
                fontSize: "10.5px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                color: activeProblemId === p.id ? "var(--fg)" : "var(--muted)",
              }}
            >
              {i + 1}. {p.title}
            </Link>
          ))}
        </div>
      )}

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
                    fontFamily: "var(--font-jetbrains-mono)",
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
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1.1,
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
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1px solid var(--line)",
                      padding: "18px 16px",
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 16,
                    }}
                  >
                    <Lock size={13} weight="bold" />
                    Submit {hintLocked} more time
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
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono)",
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          {sub.runtime} ms
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
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
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
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
                <div style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{activeCase.expected}</div>
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
                    fontFamily: "var(--font-jetbrains-mono)",
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
                fontFamily: "var(--font-jetbrains-mono)",
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
              const solution = crewSolutions.find((c) => c.userId === m.userId);
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
                  {solution?.status === "visible" && solution.link && (
                    <Link
                      href={solution.link}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10,
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--accent)",
                      }}
                    >
                      view <ArrowRight size={10} weight="bold" />
                    </Link>
                  )}
                  {solution?.status === "locked" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--line)",
                      }}
                    >
                      locked
                    </span>
                  )}
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
                fontFamily: "var(--font-jetbrains-mono)",
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
