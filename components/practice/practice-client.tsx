"use client";

import dynamic from "next/dynamic";
import { ArrowLeft } from "@phosphor-icons/react";
import type { Problem } from "@/lib/problems";
import { Button } from "@/components/ui/button";
import {
  useProblemWorkspace,
  LANGUAGES,
  LANG_KEY,
  type DocTab,
  type SubmissionRecord,
} from "@/lib/hooks/use-problem-workspace";

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

export function PracticeClient({
  problem,
  previousSubmissions,
}: {
  problem: Problem;
  previousSubmissions: SubmissionRecord[];
}) {
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
  } = useProblemWorkspace({ problem, previousSubmissions });

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
        <Button
          href="/practice"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} weight="bold" />}
          style={{ padding: 0, letterSpacing: "0.14em", fontSize: "10.5px" }}
        >
          Practice
        </Button>
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          solo &middot; {problem.difficulty}
        </span>
      </div>

      {/* ---- Main 2-column layout ---- */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(240px, 372px) minmax(0, 1fr)",
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
                  practice // {problem.difficulty}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
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
                <p style={{ fontSize: "12.5px", lineHeight: 1.75, margin: "0 0 26px", color: "var(--fg)" }}>
                  {problem.description}
                </p>
                {problem.examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 18, border: "1px solid var(--line)", background: "var(--panel)" }}>
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
                    <div style={{ padding: "12px 14px", fontSize: 12, lineHeight: 1.9, color: "var(--muted)" }}>
                      <div>
                        <span style={{ color: "var(--accent)" }}>input</span> {ex.input}
                      </div>
                      <div>
                        <span style={{ color: "var(--accent)" }}>output</span> {ex.output}
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

            {docTab === "Hints" && (
              <div>
                <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "0 0 18px", lineHeight: 1.7 }}>
                  Hints unlock after {3} failed submissions.
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
                    Submit {hintLocked} more time{hintLocked > 1 ? "s" : ""} to unlock AI hints
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
                  {hintLoading ? "thinking..." : hint ? "Get another hint" : "Request hint"}
                </button>
                {failedCount > 0 && (
                  <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>
                    {failedCount} failed attempt{failedCount > 1 ? "s" : ""} so far
                  </div>
                )}
              </div>
            )}

            {docTab === "Submissions" && (
              <div>
                {subs.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                    No submissions yet. Write your solution and hit submit.
                  </p>
                )}
                {subs.map((sub, i) => {
                  const isAccepted = sub.verdict === "accepted";
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
                          background: isAccepted ? "var(--accent)" : "var(--muted)",
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
                        <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--muted)" }}>
                          {sub.runtime} ms
                        </span>
                      )}
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
            <span style={{ fontSize: 10 }}>ctrl+enter: run &middot; ctrl+shift+enter: submit</span>
          </div>
        </div>

        {/* ---- Editor + run/submit ---- */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
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
                background: "var(--panel)",
                color: "var(--fg)",
                height: "100%",
              }}
            >
              solution.{LANG_KEY[language] === "python" ? "py" : LANG_KEY[language] === "cpp" ? "cpp" : "java"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor language={language} value={code} onChange={handleCodeChange} />
          </div>

          <div style={{ flex: "none", borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px 0" }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {testCases.map((c, i) => {
                  const result = submitResults?.[i];
                  const dotColor = result ? (result.passed ? "var(--accent)" : "#e06060") : "var(--muted)";
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
                        color: caseIdx === i ? "var(--fg)" : "var(--muted)",
                      }}
                    >
                      <span style={{ width: 5, height: 5, background: dotColor }} />
                      Case {i + 1}
                    </button>
                  );
                })}
              </div>
              {verdict && (
                <span style={{ fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: verdictColor, whiteSpace: "nowrap" }}>
                  {verdict.replace(/_/g, " ")}
                  {runtime != null ? ` · ${runtime} ms` : ""}
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: 16, gap: 20, fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                  input
                </div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {activeCase.input}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                  expected
                </div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{activeCase.expected}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                  your output
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: submitResults?.[caseIdx] ? (submitResults[caseIdx].passed ? "var(--accent)" : "#e06060") : "var(--muted)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {submitResults?.[caseIdx]?.got ?? runOutput ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
              {runStatus === "running" ? "running..." : runStatus === "submitting" ? "submitting..." : "autosaved"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  cursor: runStatus !== "idle" ? "wait" : "pointer",
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
                  cursor: runStatus !== "idle" ? "wait" : "pointer",
                  opacity: runStatus !== "idle" ? 0.6 : 1,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
