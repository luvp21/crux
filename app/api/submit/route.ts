import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { submissions, problems } from "@/db/schema";
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
  crewId: string;
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
    const { problemId, crewId, code, language } = body;

    if (!problemId || !crewId || !code) {
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

      // Record submission
      const [sub] = await db
        .insert(submissions)
        .values({
          userId: session.user.id,
          problemId,
          crewId,
          code,
          language,
          verdict: mockVerdict,
          runtime: Math.floor(30 + Math.random() * 70),
          context: "daily",
        })
        .returning({ id: submissions.id });

      if (mockVerdict === "accepted") {
        await updateStreaksAfterSolve(session.user.id, crewId);
      }

      return NextResponse.json({
        verdict: mockVerdict,
        runtime: 41,
        results,
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

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

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
        overallVerdict = "runtime_error";
        results.push({ case: i + 1, input: tc.input, expected: tc.expected, got: "Judge0 error", passed: false });
        continue;
      }

      const result = await res.json();
      const stdout = result.stdout
        ? Buffer.from(result.stdout, "base64").toString().trim()
        : "";

      const statusId = result.status?.id ?? 0;
      const passed = stdout === tc.expected.trim();
      totalTime += parseFloat(result.time ?? "0") * 1000;

      let caseVerdict: Verdict = "accepted";
      if (statusId === 5) caseVerdict = "time_limit_exceeded";
      else if (statusId >= 6 && statusId <= 12) caseVerdict = "runtime_error";
      else if (!passed) caseVerdict = "wrong_answer";

      if (caseVerdict !== "accepted" && overallVerdict === "accepted") {
        overallVerdict = caseVerdict;
      }

      results.push({
        case: i + 1,
        input: tc.input,
        expected: tc.expected,
        got: stdout,
        passed,
      });
    }

    const runtime = Math.round(totalTime);

    // Record submission
    const [sub] = await db
      .insert(submissions)
      .values({
        userId: session.user.id,
        problemId,
        crewId,
        code,
        language,
        verdict: overallVerdict as "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded",
        runtime,
        context: "daily",
      })
      .returning({ id: submissions.id });

    if (overallVerdict === "accepted") {
      await updateStreaksAfterSolve(session.user.id, crewId);
    }

    return NextResponse.json({
      verdict: overallVerdict as string,
      runtime,
      results,
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
