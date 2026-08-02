import type { RunnerMeta } from "./types";

/**
 * Maps each seed problem's title to the metadata needed to generate a
 * real-execution driver (method name, param/return types). A handful of
 * problems don't fit the "call one method, compare return value" model —
 * they're multi-method/stateful designs (Min Stack, Codec serialize/
 * deserialize, encode/decode round-trip) or need bespoke graph structures
 * (Clone Graph) — those are omitted here and fall back to mock execution
 * with a clear "not supported" note rather than a fake pass.
 */
export const PROBLEM_RUNNERS: Record<string, RunnerMeta> = {
  "Two sum": { method: "twoSum", params: [{ list: "int" }, "int"], returns: { list: "int" } },
  "Best time to buy and sell stock": { method: "maxProfit", params: [{ list: "int" }], returns: "int" },
  "Contains duplicate": { method: "containsDuplicate", params: [{ list: "int" }], returns: "bool" },
  "Product of array except self": { method: "productExceptSelf", params: [{ list: "int" }], returns: { list: "int" } },
  "Maximum subarray": { method: "maxSubArray", params: [{ list: "int" }], returns: "int" },
  "Valid anagram": { method: "isAnagram", params: ["str", "str"], returns: "bool" },
  "Valid palindrome": { method: "isPalindrome", params: ["str"], returns: "bool" },
  "Longest substring without repeating characters": { method: "lengthOfLongestSubstring", params: ["str"], returns: "int" },
  "Longest palindromic substring": { method: "longestPalindrome", params: ["str"], returns: "str" },
  "Group anagrams": {
    method: "groupAnagrams",
    params: [{ list: "str" }],
    returns: { list: { list: "str" } },
    javaReturnType: "List<List<String>>",
  },
  "Reverse linked list": { method: "reverseList", params: ["listnode"], returns: "listnode" },
  "Merge two sorted lists": { method: "mergeTwoLists", params: ["listnode", "listnode"], returns: "listnode" },
  "Linked list cycle": { method: "hasCycle", params: ["listnode_cyclic"], returns: "bool" },
  "Valid parentheses": { method: "isValid", params: ["str"], returns: "bool" },
  // "Min stack" — multi-method stateful class, op-sequence test format. Unsupported.
  "Binary search": { method: "search", params: [{ list: "int" }, "int"], returns: "int" },
  "Search in rotated sorted array": { method: "search", params: [{ list: "int" }, "int"], returns: "int" },
  "Invert binary tree": { method: "invertTree", params: ["treenode"], returns: "treenode" },
  "Maximum depth of binary tree": { method: "maxDepth", params: ["treenode"], returns: "int" },
  "Validate binary search tree": { method: "isValidBST", params: ["treenode"], returns: "bool" },
  "Binary tree level order traversal": {
    method: "levelOrder",
    params: ["treenode"],
    returns: { list: { list: "int" } },
    javaReturnType: "List<List<Integer>>",
  },
  "Lowest common ancestor of a binary tree": {
    method: "lowestCommonAncestor",
    params: ["treenode", "treenode_ref", "treenode_ref"],
    returns: "treenode_val",
  },
  "Number of islands": { method: "numIslands", params: [{ list: { list: "char" } }], returns: "int" },
  // "Clone graph" — custom Node/graph structure, not generically serializable. Unsupported.
  "Course schedule": { method: "canFinish", params: ["int", { list: { list: "int" } }], returns: "bool" },
  "Pacific atlantic water flow": {
    method: "pacificAtlantic",
    params: [{ list: { list: "int" } }],
    returns: { list: { list: "int" } },
    javaReturnType: "List<List<Integer>>",
  },
  "Climbing stairs": { method: "climbStairs", params: ["int"], returns: "int" },
  "House robber": { method: "rob", params: [{ list: "int" }], returns: "int" },
  "Coin change": { method: "coinChange", params: [{ list: "int" }, "int"], returns: "int" },
  "Longest increasing subsequence": { method: "lengthOfLIS", params: [{ list: "int" }], returns: "int" },
  "Word break": {
    method: "wordBreak",
    params: ["str", { list: "str" }],
    returns: "bool",
    javaParamTypes: [undefined, "List<String>"],
  },
  "Minimum window substring": { method: "minWindow", params: ["str", "str"], returns: "str" },
  "Sliding window maximum": { method: "maxSlidingWindow", params: [{ list: "int" }, "int"], returns: { list: "int" } },
  "Top k frequent elements": { method: "topKFrequent", params: [{ list: "int" }, "int"], returns: { list: "int" } },
  // "Encode and decode strings" — round-trip test (decode(encode(x)) == x), not a single-call comparison. Unsupported.
  "Jump game": { method: "canJump", params: [{ list: "int" }], returns: "bool" },
  "Merge intervals": { method: "merge", params: [{ list: { list: "int" } }], returns: { list: { list: "int" } } },
  // "Serialize and deserialize binary tree" — two coupled methods (Codec), not a single-call comparison. Unsupported.
  "Unique paths": { method: "uniquePaths", params: ["int", "int"], returns: "int" },
  "Decode ways": { method: "numDecodings", params: ["str"], returns: "int" },
  "Graph valid tree": { method: "validTree", params: ["int", { list: { list: "int" } }], returns: "bool" },
  "Word search": { method: "exist", params: [{ list: { list: "char" } }, "str"], returns: "bool" },
  "Trapping rain water": { method: "trap", params: [{ list: "int" }], returns: "int" },
  "Median of two sorted arrays": { method: "findMedianSortedArrays", params: [{ list: "int" }, { list: "int" }], returns: "float" },
  "Merge k sorted lists": { method: "mergeKLists", params: [{ list: "listnode" }], returns: "listnode" },
  "3sum": {
    method: "threeSum",
    params: [{ list: "int" }],
    returns: { list: { list: "int" } },
    javaReturnType: "List<List<Integer>>",
  },
  "Container with most water": { method: "maxArea", params: [{ list: "int" }], returns: "int" },
  "Set matrix zeroes": { method: "setZeroes", params: [{ list: { list: "int" } }], returns: "void", mutates: 0 },
  "Spiral matrix": {
    method: "spiralOrder",
    params: [{ list: { list: "int" } }],
    returns: { list: "int" },
    javaReturnType: "List<Integer>",
  },
  "Rotate image": { method: "rotate", params: [{ list: { list: "int" } }], returns: "void", mutates: 0 },
};
