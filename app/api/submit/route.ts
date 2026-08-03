import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { submissions, problems, codeCheckpoints } from "@/db/schema";
import { updateStreaksAfterSolve } from "@/lib/streak";
import { buildDriverCode } from "@/lib/runner";

const JUDGE0_URL = process.env.JUDGE0_URL;
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;

const LANG_IDS: Record<string, number> = {
  python: 71,
  cpp: 54,
  java: 62,
  javascript: 63,
};

interface SubmitRequest {
  problemId: string;
  crewId?: string | null;
  contestId?: string | null;
  code: string;
  language: string;
}

type Verdict = "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded";

/**
 * POST /api/submit
 * Runs code against all test cases, determines verdict, records submission.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SubmitRequest;
    const { problemId, crewId, contestId, code, language } = body;

    if (!problemId || !code) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fetch problem + test cases
    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const testCases = (problem.testCases as { input: string; expected: string }[]) ?? [];
    const hiddenTestCases = (problem.hiddenTestCases as { input: string; expected: string }[]) ?? [];

    // ---- Mock mode ----
    if (!JUDGE0_URL) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

      // In mock mode, randomly decide verdict for realistic feel
      const mockVerdict: Verdict = Math.random() > 0.3 ? "accepted" : "wrong_answer";
      const results = testCases.map((tc, i) => ({
        case: i + 1,
        input: tc.input,
        expected: tc.expected,
        got: mockVerdict === "accepted" ? tc.expected : "mock_output",
        passed: mockVerdict === "accepted",
      }));
      const hiddenPassedCount = mockVerdict === "accepted" ? hiddenTestCases.length : 0;

      // Record submission
      const [sub] = await db
        .insert(submissions)
        .values({
          userId: session.user.id,
          problemId,
          crewId: crewId ?? null,
          contestId: contestId ?? null,
          code,
          language,
          verdict: mockVerdict,
          runtime: Math.floor(30 + Math.random() * 70),
          context: contestId ? "contest" : crewId ? "daily" : "practice",
        })
        .returning({ id: submissions.id });

      await db
        .update(codeCheckpoints)
        .set({ submissionId: sub.id })
        .where(
          and(
            eq(codeCheckpoints.userId, session.user.id),
            eq(codeCheckpoints.problemId, problemId),
            crewId ? eq(codeCheckpoints.crewId, crewId) : isNull(codeCheckpoints.crewId),
            isNull(codeCheckpoints.submissionId),
          ),
        );

      if (mockVerdict === "accepted" && crewId) {
        await updateStreaksAfterSolve(session.user.id, crewId);
      }

      return NextResponse.json({
        verdict: mockVerdict,
        runtime: 41,
        results,
        hiddenResults: { total: hiddenTestCases.length, passed: hiddenPassedCount },
        submissionId: sub.id,
        mock: true,
      });
    }

    // ---- Real Judge0 execution ----
    if (!problem.runnerMeta) {
      return NextResponse.json(
        { error: "Real code execution isn't available for this problem yet." },
        { status: 501 },
      );
    }

    const langId = LANG_IDS[language] ?? LANG_IDS.python;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;

    const driverCode = buildDriverCode(language, code, problem.runnerMeta);

    const results: { case: number; input: string; expected: string; got: string; passed: boolean }[] = [];
    let overallVerdict: Verdict = "accepted";
    let totalTime = 0;
    let hiddenPassed = 0;

    async function runCase(tc: { input: string; expected: string }) {
      const res = await fetch(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,status,time,memory,compile_output`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            source_code: Buffer.from(driverCode).toString("base64"),
            language_id: langId,
            stdin: Buffer.from(tc.input).toString("base64"),
          }),
        },
      );

      if (!res.ok) {
        return { verdict: "runtime_error" as Verdict, stdout: "Judge0 error", time: 0, passed: false };
      }

      const result = await res.json();
      const stdout = result.stdout ? Buffer.from(result.stdout, "base64").toString().trim() : "";
      const statusId = result.status?.id ?? 0;
      const outputMatches = stdout === tc.expected.trim();

      let caseVerdict: Verdict = "accepted";
      if (statusId === 5) caseVerdict = "time_limit_exceeded";
      else if (statusId >= 6 && statusId <= 12) caseVerdict = "runtime_error";
      else if (!outputMatches) caseVerdict = "wrong_answer";

      // `passed` reflects the case verdict, not just the raw output match — a case
      // that times out (or errors) is never "passed" even if its stdout happened to
      // match before the timeout/error occurred.
      return { verdict: caseVerdict, stdout, time: parseFloat(result.time ?? "0") * 1000, passed: caseVerdict === "accepted" };
    }

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const { verdict: caseVerdict, stdout, time, passed } = await runCase(tc);
      totalTime += time;
      if (caseVerdict !== "accepted" && overallVerdict === "accepted") overallVerdict = caseVerdict;
      results.push({ case: i + 1, input: tc.input, expected: tc.expected, got: stdout, passed });
    }

    for (const tc of hiddenTestCases) {
      const { verdict: caseVerdict, time, passed } = await runCase(tc);
      totalTime += time;
      if (caseVerdict !== "accepted" && overallVerdict === "accepted") overallVerdict = caseVerdict;
      if (passed) hiddenPassed++;
    }

    const runtime = Math.round(totalTime);

    // Record submission
    const [sub] = await db
      .insert(submissions)
      .values({
        userId: session.user.id,
        problemId,
        crewId: crewId ?? null,
        contestId: contestId ?? null,
        code,
        language,
        verdict: overallVerdict,
        runtime,
        context: contestId ? "contest" : crewId ? "daily" : "practice",
      })
      .returning({ id: submissions.id });

    await db
      .update(codeCheckpoints)
      .set({ submissionId: sub.id })
      .where(
        and(
          eq(codeCheckpoints.userId, session.user.id),
          eq(codeCheckpoints.problemId, problemId),
          crewId ? eq(codeCheckpoints.crewId, crewId) : isNull(codeCheckpoints.crewId),
          isNull(codeCheckpoints.submissionId),
        ),
      );

    if (overallVerdict === "accepted" && crewId) {
      await updateStreaksAfterSolve(session.user.id, crewId);
    }

    return NextResponse.json({
      verdict: overallVerdict as string,
      runtime,
      results,
      hiddenResults: { total: hiddenTestCases.length, passed: hiddenPassed },
      submissionId: sub.id,
    });
  } catch (err) {
    console.error("[submit] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
