/**
 * Seed data — 50 classic DSA problems covering the core topics students
 * grind for placements: arrays, strings, linked lists, trees, graphs, DP,
 * sliding window, hashing, stacks, binary search, greedy, sorting.
 *
 * Run: npx tsx db/seed.ts  (requires DATABASE_URL in .env.local)
 */

export type SeedProblem = {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topicTag: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string;
  starterCode: Record<string, string>;
  testCases: { input: string; expected: string }[];
};

export const PROBLEMS: SeedProblem[] = [
  // ---- arrays ----
  {
    title: "Two sum",
    difficulty: "easy",
    topicTag: "arrays",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9",
    starterCode: {
      python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    twoSum(nums, target) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[2,7,11,15]\n9", expected: "[0,1]" },
      { input: "[3,2,4]\n6", expected: "[1,2]" },
      { input: "[3,3]\n6", expected: "[0,1]" },
    ],
  },
  {
    title: "Best time to buy and sell stock",
    difficulty: "easy",
    topicTag: "arrays",
    description:
      "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy and a different day in the future to sell. Return the maximum profit you can achieve. If no profit is possible, return 0.",
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5." },
      { input: "prices = [7,6,4,3,1]", output: "0" },
    ],
    constraints: "1 <= prices.length <= 10^5, 0 <= prices[i] <= 10^4",
    starterCode: {
      python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int maxProfit(int[] prices) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    maxProfit(prices) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[7,1,5,3,6,4]", expected: "5" },
      { input: "[7,6,4,3,1]", expected: "0" },
      { input: "[1,2]", expected: "1" },
    ],
  },
  {
    title: "Contains duplicate",
    difficulty: "easy",
    topicTag: "arrays",
    description:
      "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    examples: [
      { input: "nums = [1,2,3,1]", output: "true" },
      { input: "nums = [1,2,3,4]", output: "false" },
    ],
    constraints: "1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9",
    starterCode: {
      python: "class Solution:\n    def containsDuplicate(self, nums: list[int]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    containsDuplicate(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,3,1]", expected: "true" },
      { input: "[1,2,3,4]", expected: "false" },
      { input: "[1,1,1,3,3,4,3,2,4,2]", expected: "true" },
    ],
  },
  {
    title: "Product of array except self",
    difficulty: "medium",
    topicTag: "arrays",
    description:
      "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. You must solve it without using division and in O(n) time.",
    examples: [
      { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
    ],
    constraints: "2 <= nums.length <= 10^5, -30 <= nums[i] <= 30",
    starterCode: {
      python: "class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    productExceptSelf(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,3,4]", expected: "[24,12,8,6]" },
      { input: "[-1,1,0,-3,3]", expected: "[0,0,9,0,0]" },
    ],
  },
  {
    title: "Maximum subarray",
    difficulty: "medium",
    topicTag: "arrays",
    description:
      "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1]", output: "1" },
    ],
    constraints: "1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4",
    starterCode: {
      python: "class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    maxSubArray(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
      { input: "[1]", expected: "1" },
      { input: "[5,4,-1,7,8]", expected: "23" },
    ],
  },

  // ---- strings ----
  {
    title: "Valid anagram",
    difficulty: "easy",
    topicTag: "strings",
    description:
      "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true" },
      { input: 's = "rat", t = "car"', output: "false" },
    ],
    constraints: "1 <= s.length, t.length <= 5 * 10^4, s and t consist of lowercase English letters",
    starterCode: {
      python: "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean isAnagram(String s, String t) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    isAnagram(s, t) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "anagram\nnagaram", expected: "true" },
      { input: "rat\ncar", expected: "false" },
    ],
  },
  {
    title: "Valid palindrome",
    difficulty: "easy",
    topicTag: "strings",
    description:
      "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.",
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: "true" },
      { input: 's = "race a car"', output: "false" },
    ],
    constraints: "1 <= s.length <= 2 * 10^5",
    starterCode: {
      python: "class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool isPalindrome(string s) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean isPalindrome(String s) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    isPalindrome(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "A man, a plan, a canal: Panama", expected: "true" },
      { input: "race a car", expected: "false" },
      { input: " ", expected: "true" },
    ],
  },
  {
    title: "Longest substring without repeating characters",
    difficulty: "medium",
    topicTag: "sliding window",
    description:
      "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: "1" },
      { input: 's = "pwwkew"', output: "3" },
    ],
    constraints: "0 <= s.length <= 5 * 10^4",
    starterCode: {
      python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    lengthOfLongestSubstring(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "abcabcbb", expected: "3" },
      { input: "bbbbb", expected: "1" },
      { input: "pwwkew", expected: "3" },
      { input: "", expected: "0" },
    ],
  },
  {
    title: "Longest palindromic substring",
    difficulty: "medium",
    topicTag: "strings",
    description:
      "Given a string s, return the longest palindromic substring in s.",
    examples: [
      { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' },
      { input: 's = "cbbd"', output: '"bb"' },
    ],
    constraints: "1 <= s.length <= 1000",
    starterCode: {
      python: "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass\n",
      cpp: "class Solution {\npublic:\n    string longestPalindrome(string s) {\n        \n    }\n};\n",
      java: "class Solution {\n    public String longestPalindrome(String s) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    longestPalindrome(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "babad", expected: "bab" },
      { input: "cbbd", expected: "bb" },
    ],
  },
  {
    title: "Group anagrams",
    difficulty: "medium",
    topicTag: "hashing",
    description:
      'Given an array of strings strs, group the anagrams together. You can return the answer in any order. An Anagram is a word formed by rearranging the letters of a different word, using all the original letters exactly once.',
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' },
    ],
    constraints: "1 <= strs.length <= 10^4, 0 <= strs[i].length <= 100",
    starterCode: {
      python: "class Solution:\n    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        \n    }\n};\n",
      java: "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    groupAnagrams(strs) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: '["eat","tea","tan","ate","nat","bat"]', expected: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
      { input: '[""]', expected: '[[""]]' },
    ],
  },

  // ---- linked lists ----
  {
    title: "Reverse linked list",
    difficulty: "easy",
    topicTag: "linked lists",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    examples: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
      { input: "head = [1,2]", output: "[2,1]" },
    ],
    constraints: "0 <= number of nodes <= 5000, -5000 <= Node.val <= 5000",
    starterCode: {
      python: "class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};\n",
      java: "class Solution {\n    public ListNode reverseList(ListNode head) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    reverseList(head) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]" },
      { input: "[1,2]", expected: "[2,1]" },
      { input: "[]", expected: "[]" },
    ],
  },
  {
    title: "Merge two sorted lists",
    difficulty: "easy",
    topicTag: "linked lists",
    description:
      "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list by splicing together the nodes.",
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
    ],
    constraints: "0 <= number of nodes <= 50, -100 <= Node.val <= 100",
    starterCode: {
      python: "class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};\n",
      java: "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    mergeTwoLists(list1, list2) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,4]\n[1,3,4]", expected: "[1,1,2,3,4,4]" },
      { input: "[]\n[]", expected: "[]" },
      { input: "[]\n[0]", expected: "[0]" },
    ],
  },
  {
    title: "Linked list cycle",
    difficulty: "easy",
    topicTag: "linked lists",
    description:
      "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
    examples: [
      { input: "head = [3,2,0,-4], pos = 1", output: "true", explanation: "There is a cycle where tail connects to the 1st node." },
      { input: "head = [1], pos = -1", output: "false" },
    ],
    constraints: "0 <= number of nodes <= 10^4",
    starterCode: {
      python: "class Solution:\n    def hasCycle(self, head: Optional[ListNode]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool hasCycle(ListNode *head) {\n        \n    }\n};\n",
      java: "public class Solution {\n    public boolean hasCycle(ListNode head) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    hasCycle(head) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[3,2,0,-4]\n1", expected: "true" },
      { input: "[1]\n-1", expected: "false" },
    ],
  },

  // ---- stacks ----
  {
    title: "Valid parentheses",
    difficulty: "easy",
    topicTag: "stacks",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: "1 <= s.length <= 10^4",
    starterCode: {
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    isValid(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "()", expected: "true" },
      { input: "()[]{}", expected: "true" },
      { input: "(]", expected: "false" },
      { input: "([)]", expected: "false" },
    ],
  },
  {
    title: "Min stack",
    difficulty: "medium",
    topicTag: "stacks",
    description:
      "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    examples: [
      { input: '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[[],[-2],[0],[-3],[],[],[],[]]', output: "[null,null,null,null,-3,null,0,-2]" },
    ],
    constraints: "-2^31 <= val <= 2^31 - 1, pop/top/getMin called on non-empty stacks",
    starterCode: {
      python: "class MinStack:\n    def __init__(self):\n        pass\n\n    def push(self, val: int) -> None:\n        pass\n\n    def pop(self) -> None:\n        pass\n\n    def top(self) -> int:\n        pass\n\n    def getMin(self) -> int:\n        pass\n",
      cpp: "class MinStack {\npublic:\n    MinStack() {\n        \n    }\n    void push(int val) {\n        \n    }\n    void pop() {\n        \n    }\n    int top() {\n        \n    }\n    int getMin() {\n        \n    }\n};\n",
      java: "class MinStack {\n    public MinStack() {\n        \n    }\n    public void push(int val) {\n        \n    }\n    public void pop() {\n        \n    }\n    public int top() {\n        \n    }\n    public int getMin() {\n        \n    }\n}\n",
      javascript: "class MinStack {\n    constructor() {\n        \n    }\n\n    push(val) {\n        \n    }\n\n    pop() {\n        \n    }\n\n    top() {\n        \n    }\n\n    getMin() {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "push -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", expected: "-3\n0\n-2" },
    ],
  },

  // ---- binary search ----
  {
    title: "Binary search",
    difficulty: "easy",
    topicTag: "binary search",
    description:
      "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists return its index, otherwise return -1.",
    examples: [
      { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
      { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" },
    ],
    constraints: "1 <= nums.length <= 10^4, all elements are unique, nums is sorted",
    starterCode: {
      python: "class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int search(int[] nums, int target) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    search(nums, target) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[-1,0,3,5,9,12]\n9", expected: "4" },
      { input: "[-1,0,3,5,9,12]\n2", expected: "-1" },
    ],
  },
  {
    title: "Search in rotated sorted array",
    difficulty: "medium",
    topicTag: "binary search",
    description:
      "Given a rotated sorted array nums and an integer target, return the index of target if it is in nums, or -1 if it is not. You must write an algorithm with O(log n) runtime complexity.",
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
    ],
    constraints: "1 <= nums.length <= 5000, all values unique",
    starterCode: {
      python: "class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int search(int[] nums, int target) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    search(nums, target) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[4,5,6,7,0,1,2]\n0", expected: "4" },
      { input: "[4,5,6,7,0,1,2]\n3", expected: "-1" },
      { input: "[1]\n0", expected: "-1" },
    ],
  },

  // ---- trees ----
  {
    title: "Invert binary tree",
    difficulty: "easy",
    topicTag: "trees",
    description: "Given the root of a binary tree, invert the tree, and return its root.",
    examples: [
      { input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" },
      { input: "root = [2,1,3]", output: "[2,3,1]" },
    ],
    constraints: "0 <= number of nodes <= 100",
    starterCode: {
      python: "class Solution:\n    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    TreeNode* invertTree(TreeNode* root) {\n        \n    }\n};\n",
      java: "class Solution {\n    public TreeNode invertTree(TreeNode root) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    invertTree(root) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[4,2,7,1,3,6,9]", expected: "[4,7,2,9,6,3,1]" },
      { input: "[2,1,3]", expected: "[2,3,1]" },
      { input: "[]", expected: "[]" },
    ],
  },
  {
    title: "Maximum depth of binary tree",
    difficulty: "easy",
    topicTag: "trees",
    description: "Given the root of a binary tree, return its maximum depth.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "3" },
      { input: "root = [1,null,2]", output: "2" },
    ],
    constraints: "0 <= number of nodes <= 10^4",
    starterCode: {
      python: "class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int maxDepth(TreeNode root) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    maxDepth(root) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expected: "3" },
      { input: "[1,null,2]", expected: "2" },
    ],
  },
  {
    title: "Validate binary search tree",
    difficulty: "medium",
    topicTag: "trees",
    description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false" },
    ],
    constraints: "1 <= number of nodes <= 10^4",
    starterCode: {
      python: "class Solution:\n    def isValidBST(self, root: Optional[TreeNode]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean isValidBST(TreeNode root) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    isValidBST(root) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[2,1,3]", expected: "true" },
      { input: "[5,1,4,null,null,3,6]", expected: "false" },
    ],
  },
  {
    title: "Binary tree level order traversal",
    difficulty: "medium",
    topicTag: "trees",
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    constraints: "0 <= number of nodes <= 2000",
    starterCode: {
      python: "class Solution:\n    def levelOrder(self, root: Optional[TreeNode]) -> list[list[int]]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        \n    }\n};\n",
      java: "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    levelOrder(root) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expected: "[[3],[9,20],[15,7]]" },
      { input: "[1]", expected: "[[1]]" },
      { input: "[]", expected: "[]" },
    ],
  },
  {
    title: "Lowest common ancestor of a binary tree",
    difficulty: "medium",
    topicTag: "trees",
    description: "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.",
    examples: [
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1", output: "3" },
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4", output: "5" },
    ],
    constraints: "2 <= number of nodes <= 10^5, all node values unique",
    starterCode: {
      python: "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        pass\n",
      cpp: "class Solution {\npublic:\n    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n        \n    }\n};\n",
      java: "class Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    lowestCommonAncestor(root, p, q) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[3,5,1,6,2,0,8,null,null,7,4]\n5\n1", expected: "3" },
      { input: "[3,5,1,6,2,0,8,null,null,7,4]\n5\n4", expected: "5" },
    ],
  },

  // ---- graphs ----
  {
    title: "Number of islands",
    difficulty: "medium",
    topicTag: "graphs",
    description:
      'Given an m x n 2D binary grid which represents a map of \'1\'s (land) and \'0\'s (water), return the number of islands.',
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3" },
    ],
    constraints: "m == grid.length, n == grid[i].length, 1 <= m, n <= 300",
    starterCode: {
      python: "class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int numIslands(char[][] grid) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    numIslands(grid) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: '[[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]', expected: "1" },
      { input: '[[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]', expected: "3" },
    ],
  },
  {
    title: "Clone graph",
    difficulty: "medium",
    topicTag: "graphs",
    description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
    examples: [
      { input: "adjList = [[2,4],[1,3],[2,4],[1,3]]", output: "[[2,4],[1,3],[2,4],[1,3]]" },
    ],
    constraints: "1 <= number of nodes <= 100, 1 <= Node.val <= 100",
    starterCode: {
      python: "class Solution:\n    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:\n        pass\n",
      cpp: "class Solution {\npublic:\n    Node* cloneGraph(Node* node) {\n        \n    }\n};\n",
      java: "class Solution {\n    public Node cloneGraph(Node node) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    cloneGraph(node) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[2,4],[1,3],[2,4],[1,3]]", expected: "[[2,4],[1,3],[2,4],[1,3]]" },
    ],
  },
  {
    title: "Course schedule",
    difficulty: "medium",
    topicTag: "graphs",
    description:
      "There are a total of numCourses courses. You are given an array prerequisites. Return true if you can finish all courses.",
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true" },
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false" },
    ],
    constraints: "1 <= numCourses <= 2000, 0 <= prerequisites.length <= 5000",
    starterCode: {
      python: "class Solution:\n    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    canFinish(numCourses, prerequisites) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "2\n[[1,0]]", expected: "true" },
      { input: "2\n[[1,0],[0,1]]", expected: "false" },
    ],
  },
  {
    title: "Pacific atlantic water flow",
    difficulty: "medium",
    topicTag: "graphs",
    description:
      "Given an m x n matrix of non-negative integers representing the height of each unit cell, find the list of grid coordinates where water can flow to both the Pacific and Atlantic ocean.",
    examples: [
      { input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]" },
    ],
    constraints: "m == heights.length, n == heights[i].length, 1 <= m, n <= 200",
    starterCode: {
      python: "class Solution:\n    def pacificAtlantic(self, heights: list[list[int]]) -> list[list[int]]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {\n        \n    }\n};\n",
      java: "class Solution {\n    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    pacificAtlantic(heights) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]", expected: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]" },
    ],
  },

  // ---- dynamic programming ----
  {
    title: "Climbing stairs",
    difficulty: "easy",
    topicTag: "dynamic programming",
    description:
      "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    examples: [
      { input: "n = 2", output: "2", explanation: "1+1, 2" },
      { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1" },
    ],
    constraints: "1 <= n <= 45",
    starterCode: {
      python: "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int climbStairs(int n) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int climbStairs(int n) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    climbStairs(n) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "2", expected: "2" },
      { input: "3", expected: "3" },
      { input: "5", expected: "8" },
    ],
  },
  {
    title: "House robber",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      "You are a professional robber. Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police (no two adjacent houses).",
    examples: [
      { input: "nums = [1,2,3,1]", output: "4" },
      { input: "nums = [2,7,9,3,1]", output: "12" },
    ],
    constraints: "1 <= nums.length <= 100, 0 <= nums[i] <= 400",
    starterCode: {
      python: "class Solution:\n    def rob(self, nums: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int rob(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    rob(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,3,1]", expected: "4" },
      { input: "[2,7,9,3,1]", expected: "12" },
    ],
  },
  {
    title: "Coin change",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      "Given an integer array coins representing coin denominations and an integer amount, return the fewest number of coins needed to make up that amount. If not possible, return -1.",
    examples: [
      { input: "coins = [1,5,10,25], amount = 30", output: "2", explanation: "25 + 5 = 30" },
      { input: "coins = [2], amount = 3", output: "-1" },
    ],
    constraints: "1 <= coins.length <= 12, 1 <= coins[i] <= 2^31 - 1, 0 <= amount <= 10^4",
    starterCode: {
      python: "class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    coinChange(coins, amount) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,5,10,25]\n30", expected: "2" },
      { input: "[2]\n3", expected: "-1" },
      { input: "[1]\n0", expected: "0" },
    ],
  },
  {
    title: "Longest increasing subsequence",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
    examples: [
      { input: "nums = [10,9,2,5,3,7,101,18]", output: "4", explanation: "[2,3,7,101]" },
      { input: "nums = [0,1,0,3,2,3]", output: "4" },
    ],
    constraints: "1 <= nums.length <= 2500, -10^4 <= nums[i] <= 10^4",
    starterCode: {
      python: "class Solution:\n    def lengthOfLIS(self, nums: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    lengthOfLIS(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[10,9,2,5,3,7,101,18]", expected: "4" },
      { input: "[0,1,0,3,2,3]", expected: "4" },
      { input: "[7,7,7,7,7,7,7]", expected: "1" },
    ],
  },
  {
    title: "Word break",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.',
    examples: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
      { input: 's = "applepenapple", wordDict = ["apple","pen"]', output: "true" },
    ],
    constraints: "1 <= s.length <= 300, 1 <= wordDict.length <= 1000",
    starterCode: {
      python: "class Solution:\n    def wordBreak(self, s: str, wordDict: list[str]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    wordBreak(s, wordDict) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "leetcode\n[\"leet\",\"code\"]", expected: "true" },
      { input: "applepenapple\n[\"apple\",\"pen\"]", expected: "true" },
      { input: "catsandog\n[\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]", expected: "false" },
    ],
  },

  // ---- sliding window ----
  {
    title: "Minimum window substring",
    difficulty: "hard",
    topicTag: "sliding window",
    description:
      'Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If no such substring exists, return "".',
    examples: [
      { input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"' },
      { input: 's = "a", t = "a"', output: '"a"' },
    ],
    constraints: "1 <= s.length, t.length <= 10^5",
    starterCode: {
      python: "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        pass\n",
      cpp: "class Solution {\npublic:\n    string minWindow(string s, string t) {\n        \n    }\n};\n",
      java: "class Solution {\n    public String minWindow(String s, String t) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    minWindow(s, t) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "ADOBECODEBANC\nABC", expected: "BANC" },
      { input: "a\na", expected: "a" },
      { input: "a\naa", expected: "" },
    ],
  },
  {
    title: "Sliding window maximum",
    difficulty: "hard",
    topicTag: "sliding window",
    description:
      "Given an array nums and a sliding window of size k moving from left to right, return the max value in each window.",
    examples: [
      { input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[3,3,5,5,6,7]" },
    ],
    constraints: "1 <= nums.length <= 10^5, 1 <= k <= nums.length",
    starterCode: {
      python: "class Solution:\n    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int[] maxSlidingWindow(int[] nums, int k) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    maxSlidingWindow(nums, k) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,3,-1,-3,5,3,6,7]\n3", expected: "[3,3,5,5,6,7]" },
      { input: "[1]\n1", expected: "[1]" },
    ],
  },

  // ---- hashing ----
  {
    title: "Top k frequent elements",
    difficulty: "medium",
    topicTag: "hashing",
    description:
      "Given an integer array nums and an integer k, return the k most frequent elements.",
    examples: [
      { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
      { input: "nums = [1], k = 1", output: "[1]" },
    ],
    constraints: "1 <= nums.length <= 10^5, 1 <= k <= number of unique elements",
    starterCode: {
      python: "class Solution:\n    def topKFrequent(self, nums: list[int], k: int) -> list[int]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    topKFrequent(nums, k) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,1,1,2,2,3]\n2", expected: "[1,2]" },
      { input: "[1]\n1", expected: "[1]" },
    ],
  },
  {
    title: "Encode and decode strings",
    difficulty: "medium",
    topicTag: "strings",
    description:
      'Design an algorithm to encode a list of strings to a single string. Implement the encode and decode methods.',
    examples: [
      { input: '["Hello","World"]', output: '["Hello","World"]' },
    ],
    constraints: "0 <= strs.length <= 200, 0 <= strs[i].length <= 200",
    starterCode: {
      python: "class Codec:\n    def encode(self, strs: list[str]) -> str:\n        pass\n\n    def decode(self, s: str) -> list[str]:\n        pass\n",
      cpp: "class Codec {\npublic:\n    string encode(vector<string>& strs) {\n        \n    }\n    vector<string> decode(string s) {\n        \n    }\n};\n",
      java: "public class Codec {\n    public String encode(List<String> strs) {\n        \n    }\n    public List<String> decode(String s) {\n        \n    }\n}\n",
      javascript: "class Codec {\n    encode(strs) {\n        \n    }\n\n    decode(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: '["Hello","World"]', expected: '["Hello","World"]' },
      { input: '[""]', expected: '[""]' },
    ],
  },

  // ---- greedy ----
  {
    title: "Jump game",
    difficulty: "medium",
    topicTag: "greedy",
    description:
      "You are given an integer array nums where nums[i] represents the maximum jump length at that position. Return true if you can reach the last index.",
    examples: [
      { input: "nums = [2,3,1,1,4]", output: "true" },
      { input: "nums = [3,2,1,0,4]", output: "false" },
    ],
    constraints: "1 <= nums.length <= 10^4, 0 <= nums[i] <= 10^5",
    starterCode: {
      python: "class Solution:\n    def canJump(self, nums: list[int]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool canJump(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean canJump(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    canJump(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[2,3,1,1,4]", expected: "true" },
      { input: "[3,2,1,0,4]", expected: "false" },
    ],
  },
  {
    title: "Merge intervals",
    difficulty: "medium",
    topicTag: "sorting",
    description:
      "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
    examples: [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" },
      { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]" },
    ],
    constraints: "1 <= intervals.length <= 10^4",
    starterCode: {
      python: "class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int[][] merge(int[][] intervals) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    merge(intervals) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expected: "[[1,6],[8,10],[15,18]]" },
      { input: "[[1,4],[4,5]]", expected: "[[1,5]]" },
    ],
  },

  // ---- more trees ----
  {
    title: "Serialize and deserialize binary tree",
    difficulty: "hard",
    topicTag: "trees",
    description:
      "Design an algorithm to serialize and deserialize a binary tree into a string and back.",
    examples: [
      { input: "root = [1,2,3,null,null,4,5]", output: "[1,2,3,null,null,4,5]" },
    ],
    constraints: "0 <= number of nodes <= 10^4",
    starterCode: {
      python: "class Codec:\n    def serialize(self, root: Optional[TreeNode]) -> str:\n        pass\n\n    def deserialize(self, data: str) -> Optional[TreeNode]:\n        pass\n",
      cpp: "class Codec {\npublic:\n    string serialize(TreeNode* root) {\n        \n    }\n    TreeNode* deserialize(string data) {\n        \n    }\n};\n",
      java: "public class Codec {\n    public String serialize(TreeNode root) {\n        \n    }\n    public TreeNode deserialize(String data) {\n        \n    }\n}\n",
      javascript: "class Codec {\n    serialize(root) {\n        \n    }\n\n    deserialize(data) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,2,3,null,null,4,5]", expected: "[1,2,3,null,null,4,5]" },
      { input: "[]", expected: "[]" },
    ],
  },

  // ---- more DP ----
  {
    title: "Unique paths",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      "A robot is on an m x n grid, starting at top-left. It can only move right or down. How many unique paths are there to the bottom-right corner?",
    examples: [
      { input: "m = 3, n = 7", output: "28" },
      { input: "m = 3, n = 2", output: "3" },
    ],
    constraints: "1 <= m, n <= 100",
    starterCode: {
      python: "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int uniquePaths(int m, int n) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    uniquePaths(m, n) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "3\n7", expected: "28" },
      { input: "3\n2", expected: "3" },
    ],
  },
  {
    title: "Decode ways",
    difficulty: "medium",
    topicTag: "dynamic programming",
    description:
      'A message containing letters A-Z can be encoded as "1" to "26". Given a string s containing only digits, return the number of ways to decode it.',
    examples: [
      { input: 's = "12"', output: "2", explanation: '"AB" (1 2) or "L" (12)' },
      { input: 's = "226"', output: "3" },
    ],
    constraints: "1 <= s.length <= 100",
    starterCode: {
      python: "class Solution:\n    def numDecodings(self, s: str) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int numDecodings(string s) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int numDecodings(String s) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    numDecodings(s) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "12", expected: "2" },
      { input: "226", expected: "3" },
      { input: "06", expected: "0" },
    ],
  },

  // ---- more graphs ----
  {
    title: "Graph valid tree",
    difficulty: "medium",
    topicTag: "graphs",
    description:
      "Given n nodes labeled from 0 to n-1 and a list of undirected edges, check if these edges make up a valid tree.",
    examples: [
      { input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", output: "true" },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]", output: "false" },
    ],
    constraints: "1 <= n <= 2000, 0 <= edges.length <= 5000",
    starterCode: {
      python: "class Solution:\n    def validTree(self, n: int, edges: list[list[int]]) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool validTree(int n, vector<vector<int>>& edges) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean validTree(int n, int[][] edges) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    validTree(n, edges) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "5\n[[0,1],[0,2],[0,3],[1,4]]", expected: "true" },
      { input: "5\n[[0,1],[1,2],[2,3],[1,3],[1,4]]", expected: "false" },
    ],
  },
  {
    title: "Word search",
    difficulty: "medium",
    topicTag: "graphs",
    description:
      "Given an m x n grid of characters board and a string word, return true if word exists in the grid (constructed from sequentially adjacent cells).",
    examples: [
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true" },
    ],
    constraints: "m == board.length, n == board[i].length, 1 <= m, n <= 6, 1 <= word.length <= 15",
    starterCode: {
      python: "class Solution:\n    def exist(self, board: list[list[str]], word: str) -> bool:\n        pass\n",
      cpp: "class Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        \n    }\n};\n",
      java: "class Solution {\n    public boolean exist(char[][] board, String word) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    exist(board, word) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: '[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\nABCCED', expected: "true" },
      { input: '[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\nSEE', expected: "true" },
      { input: '[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\nABCB', expected: "false" },
    ],
  },

  // ---- more hard problems ----
  {
    title: "Trapping rain water",
    difficulty: "hard",
    topicTag: "arrays",
    description:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    examples: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraints: "n == height.length, 1 <= n <= 2 * 10^4, 0 <= height[i] <= 10^5",
    starterCode: {
      python: "class Solution:\n    def trap(self, height: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int trap(int[] height) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    trap(height) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expected: "6" },
      { input: "[4,2,0,3,2,5]", expected: "9" },
    ],
  },
  {
    title: "Median of two sorted arrays",
    difficulty: "hard",
    topicTag: "binary search",
    description:
      "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    examples: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.0" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.5" },
    ],
    constraints: "0 <= m, n <= 1000, 1 <= m + n <= 2000",
    starterCode: {
      python: "class Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        pass\n",
      cpp: "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        \n    }\n};\n",
      java: "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    findMedianSortedArrays(nums1, nums2) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,3]\n[2]", expected: "2.0" },
      { input: "[1,2]\n[3,4]", expected: "2.5" },
    ],
  },
  {
    title: "Merge k sorted lists",
    difficulty: "hard",
    topicTag: "linked lists",
    description:
      "Given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list.",
    examples: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
    ],
    constraints: "k == lists.length, 0 <= k <= 10^4",
    starterCode: {
      python: "class Solution:\n    def mergeKLists(self, lists: list[Optional[ListNode]]) -> Optional[ListNode]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        \n    }\n};\n",
      java: "class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    mergeKLists(lists) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,4,5],[1,3,4],[2,6]]", expected: "[1,1,2,3,4,4,5,6]" },
      { input: "[]", expected: "[]" },
    ],
  },

  // ---- more medium classics ----
  {
    title: "3sum",
    difficulty: "medium",
    topicTag: "arrays",
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
    examples: [
      { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
      { input: "nums = [0,1,1]", output: "[]" },
    ],
    constraints: "3 <= nums.length <= 3000, -10^5 <= nums[i] <= 10^5",
    starterCode: {
      python: "class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};\n",
      java: "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    threeSum(nums) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[-1,0,1,2,-1,-4]", expected: "[[-1,-1,2],[-1,0,1]]" },
      { input: "[0,1,1]", expected: "[]" },
      { input: "[0,0,0]", expected: "[[0,0,0]]" },
    ],
  },
  {
    title: "Container with most water",
    difficulty: "medium",
    topicTag: "arrays",
    description:
      "Given n non-negative integers a1, a2, ..., an where each represents a point at coordinate (i, ai). Find two lines which together with the x-axis forms a container, such that the container contains the most water.",
    examples: [
      { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
    ],
    constraints: "n == height.length, 2 <= n <= 10^5, 0 <= height[i] <= 10^4",
    starterCode: {
      python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        pass\n",
      cpp: "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};\n",
      java: "class Solution {\n    public int maxArea(int[] height) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    maxArea(height) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[1,8,6,2,5,4,8,3,7]", expected: "49" },
      { input: "[1,1]", expected: "1" },
    ],
  },

  // ---- matrix / 2D ----
  {
    title: "Set matrix zeroes",
    difficulty: "medium",
    topicTag: "arrays",
    description:
      "Given an m x n integer matrix, if an element is 0, set its entire row and column to 0. You must do it in place.",
    examples: [
      { input: "matrix = [[1,1,1],[1,0,1],[1,1,1]]", output: "[[1,0,1],[0,0,0],[1,0,1]]" },
    ],
    constraints: "m == matrix.length, n == matrix[0].length, 1 <= m, n <= 200",
    starterCode: {
      python: "class Solution:\n    def setZeroes(self, matrix: list[list[int]]) -> None:\n        pass\n",
      cpp: "class Solution {\npublic:\n    void setZeroes(vector<vector<int>>& matrix) {\n        \n    }\n};\n",
      java: "class Solution {\n    public void setZeroes(int[][] matrix) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    setZeroes(matrix) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,1,1],[1,0,1],[1,1,1]]", expected: "[[1,0,1],[0,0,0],[1,0,1]]" },
      { input: "[[0,1,2,0],[3,4,5,2],[1,3,1,5]]", expected: "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]" },
    ],
  },
  {
    title: "Spiral matrix",
    difficulty: "medium",
    topicTag: "arrays",
    description: "Given an m x n matrix, return all elements of the matrix in spiral order.",
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[1,2,3,6,9,8,7,4,5]" },
    ],
    constraints: "m == matrix.length, n == matrix[i].length, 1 <= m, n <= 10",
    starterCode: {
      python: "class Solution:\n    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:\n        pass\n",
      cpp: "class Solution {\npublic:\n    vector<int> spiralOrder(vector<vector<int>>& matrix) {\n        \n    }\n};\n",
      java: "class Solution {\n    public List<Integer> spiralOrder(int[][] matrix) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    spiralOrder(matrix) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,2,3],[4,5,6],[7,8,9]]", expected: "[1,2,3,6,9,8,7,4,5]" },
      { input: "[[1,2,3,4],[5,6,7,8],[9,10,11,12]]", expected: "[1,2,3,4,8,12,11,10,9,5,6,7]" },
    ],
  },
  {
    title: "Rotate image",
    difficulty: "medium",
    topicTag: "arrays",
    description: "Rotate the image (n x n 2D matrix) by 90 degrees clockwise, in-place.",
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[[7,4,1],[8,5,2],[9,6,3]]" },
    ],
    constraints: "n == matrix.length == matrix[i].length, 1 <= n <= 20",
    starterCode: {
      python: "class Solution:\n    def rotate(self, matrix: list[list[int]]) -> None:\n        pass\n",
      cpp: "class Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        \n    }\n};\n",
      java: "class Solution {\n    public void rotate(int[][] matrix) {\n        \n    }\n}\n",
      javascript: "class Solution {\n    rotate(matrix) {\n        \n    }\n}\n",
    },
    testCases: [
      { input: "[[1,2,3],[4,5,6],[7,8,9]]", expected: "[[7,4,1],[8,5,2],[9,6,3]]" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed runner — only executes when this file is run directly with `npx tsx`
// ---------------------------------------------------------------------------

async function main() {
  // Dynamic import to avoid pulling DB deps into the type-only export above
  const { db } = await import("./index");
  const { problems } = await import("./schema");
  const { PROBLEM_RUNNERS } = await import("../lib/runner/problem-runners");

  console.log(`Seeding ${PROBLEMS.length} problems…`);

  for (const p of PROBLEMS) {
    await db.insert(problems).values({
      title: p.title,
      difficulty: p.difficulty,
      topicTag: p.topicTag,
      description: p.description,
      examples: p.examples,
      constraints: p.constraints,
      starterCode: p.starterCode,
      testCases: p.testCases,
      runnerMeta: PROBLEM_RUNNERS[p.title] ?? null,
    });
  }

  console.log("Done.");
  process.exit(0);
}

// Only run when invoked directly (not when imported)
if (typeof require !== "undefined" && require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("seed.ts")
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
