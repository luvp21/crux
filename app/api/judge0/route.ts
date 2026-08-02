import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { problems } from "@/db/schema";
import { buildDriverCode } from "@/lib/runner";

const JUDGE0_URL = process.env.JUDGE0_URL;
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;

// Judge0 language IDs
const LANG_IDS: Record<string, number> = {
  python: 71,   // Python 3
  cpp: 54,      // C++ 17
  java: 62,     // Java
  javascript: 63,
};

interface RunRequest {
  code: string;
  language: string;
  stdin?: string;
  problemId?: string;
}

/**
 * POST /api/judge0
 * Proxies code execution to Judge0. Falls back to a mock response
 * if JUDGE0_URL isn't set (for local dev without a Judge0 instance).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RunRequest;
    const { code, language, stdin = "", problemId } = body;

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const langId = LANG_IDS[language] ?? LANG_IDS.python;

    let runCode = code;
    if (JUDGE0_URL && problemId) {
      const [problem] = await db
        .select({ runnerMeta: problems.runnerMeta })
        .from(problems)
        .where(eq(problems.id, problemId))
        .limit(1);
      if (problem?.runnerMeta) {
        runCode = buildDriverCode(language, code, problem.runnerMeta);
      }
    }

    // ---- Mock mode (no Judge0 instance) ----
    if (!JUDGE0_URL) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      return NextResponse.json({
        stdout: "Mock output — set JUDGE0_URL for real execution\n",
        stderr: "",
        status: { id: 3, description: "Accepted" },
        time: "0.041",
        memory: 3200,
        mock: true,
      });
    }

    // ---- Real Judge0 submission ----
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (JUDGE0_AUTH_TOKEN) {
      headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
    }

    // Create submission (synchronous mode with wait)
    const submitRes = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,status,time,memory,compile_output`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: Buffer.from(runCode).toString("base64"),
          language_id: langId,
          stdin: Buffer.from(stdin).toString("base64"),
        }),
      },
    );

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return NextResponse.json(
        { error: `Judge0 error: ${submitRes.status}`, detail: errText },
        { status: 502 },
      );
    }

    const result = await submitRes.json();

    return NextResponse.json({
      stdout: result.stdout
        ? Buffer.from(result.stdout, "base64").toString()
        : "",
      stderr: result.stderr
        ? Buffer.from(result.stderr, "base64").toString()
        : "",
      compile_output: result.compile_output
        ? Buffer.from(result.compile_output, "base64").toString()
        : "",
      status: result.status,
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    console.error("[judge0] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
