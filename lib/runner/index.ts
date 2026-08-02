import type { RunnerMeta } from "./types";
import { buildPythonDriver } from "./python";
import { buildJavascriptDriver } from "./javascript";
import { buildCppDriver } from "./cpp";
import { buildJavaDriver } from "./java";

export type { RunnerMeta, PType } from "./types";
export { PROBLEM_RUNNERS } from "./problem-runners";

/**
 * Wraps a user's raw `class Solution` submission with the stdin-parsing /
 * invocation / stdout-printing driver for the given language, so it can
 * run directly on Judge0 and produce output matching testCases[].expected.
 */
export function buildDriverCode(language: string, userCode: string, runner: RunnerMeta): string {
  switch (language) {
    case "python":
      return buildPythonDriver(userCode, runner);
    case "javascript":
      return buildJavascriptDriver(userCode, runner);
    case "cpp":
      return buildCppDriver(userCode, runner);
    case "java":
      return buildJavaDriver(userCode, runner);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}
