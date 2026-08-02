import { describe, it, expect } from "vitest";
import { selectChallengeProblem, type ChallengeCandidate } from "@/lib/challenge-selection";

const PROBLEMS: ChallengeCandidate[] = [
  { id: "p1", topicTag: "arrays", difficulty: "easy" },
  { id: "p2", topicTag: "trees,recursion", difficulty: "medium" },
  { id: "p3", topicTag: "trees", difficulty: "hard" },
  { id: "p4", topicTag: "graphs", difficulty: "hard" },
];

describe("selectChallengeProblem", () => {
  it("picks within the topic+difficulty filter when both match", () => {
    const result = selectChallengeProblem(PROBLEMS, { topicTag: "trees", difficulty: "hard" }, null, () => 0);
    expect(result?.id).toBe("p3");
  });

  it("matches a comma-separated topicTag containing the requested topic", () => {
    const result = selectChallengeProblem(PROBLEMS, { topicTag: "recursion", difficulty: null }, null, () => 0);
    expect(result?.id).toBe("p2");
  });

  it("falls back to unfiltered pick when the filter matches nothing", () => {
    const result = selectChallengeProblem(
      PROBLEMS,
      { topicTag: "dynamic-programming", difficulty: "easy" },
      null,
      () => 0,
    );
    expect(result?.id).toBe("p1"); // unfiltered pool, rng() = 0 picks the first
  });

  it("falls back to unfiltered pick when there is no preference", () => {
    const result = selectChallengeProblem(PROBLEMS, null, null, () => 0);
    expect(result?.id).toBe("p1");
  });

  it("excludes the given problem id from the pool", () => {
    const result = selectChallengeProblem(PROBLEMS, null, "p1", () => 0);
    expect(result?.id).toBe("p2");
  });

  it("returns null when the pool is empty after exclusion", () => {
    const result = selectChallengeProblem([PROBLEMS[0]], null, "p1", () => 0);
    expect(result).toBeNull();
  });
});
