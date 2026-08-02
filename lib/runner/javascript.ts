import type { PType, RunnerMeta } from "./types";

function needsBuild(t: PType): boolean {
  if (t === "listnode" || t === "treenode") return true;
  if (typeof t === "object" && "list" in t) return needsBuild(t.list);
  return false;
}

function transform(t: PType, rawExpr: string): string {
  if (typeof t === "object" && "list" in t) {
    if (!needsBuild(t.list)) return rawExpr;
    return `${rawExpr}.map(_x => ${transform(t.list, "_x")})`;
  }
  if (t === "listnode") return `_buildList(${rawExpr})`;
  if (t === "treenode") return `_buildTree(${rawExpr})`;
  return rawExpr;
}

function paramStatements(params: PType[]): string[] {
  const lines: string[] = [];
  params.forEach((t, idx) => {
    const v = `_p${idx}`;
    if (t === "int" || t === "float") lines.push(`const ${v} = Number(_nextLine().trim());`);
    else if (t === "bool") lines.push(`const ${v} = _nextLine().trim() === "true";`);
    else if (t === "str") lines.push(`const ${v} = _nextLine();`);
    else if (t === "listnode") lines.push(`const ${v} = _buildList(JSON.parse(_nextLine()));`);
    else if (t === "listnode_cyclic") {
      lines.push(`const _arr${idx} = JSON.parse(_nextLine());`);
      lines.push(`const _pos${idx} = Number(_nextLine().trim());`);
      lines.push(`const ${v} = _buildListCyclic(_arr${idx}, _pos${idx});`);
    } else if (t === "treenode") lines.push(`const ${v} = _buildTree(JSON.parse(_nextLine()));`);
    else if (t === "treenode_ref") lines.push(`const ${v} = _findNode(_p0, Number(_nextLine().trim()));`);
    else if (typeof t === "object" && "list" in t) {
      lines.push(`const ${v} = ${transform(t, "JSON.parse(_nextLine())")};`);
    } else {
      throw new Error(`Unsupported param type: ${JSON.stringify(t)}`);
    }
  });
  return lines;
}

function outputStatement(runner: RunnerMeta): string {
  if (runner.mutates !== undefined) return `console.log(_fmt(_p${runner.mutates}));`;
  const r = runner.returns;
  if (r === "listnode") return `console.log(_fmt(_serializeList(_result)));`;
  if (r === "treenode") return `console.log(_fmt(_serializeTree(_result)));`;
  if (r === "treenode_val") return `console.log(_result !== null && _result !== undefined ? String(_result.val) : "null");`;
  if (r === "float") return `console.log(_fmtFloat(_result));`;
  return `console.log(_fmt(_result));`;
}

const PRELUDE = `class ListNode {
  constructor(val, next) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

class TreeNode {
  constructor(val, left, right) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

function _buildList(arr) {
  let head = null, tail = null;
  for (const v of arr) {
    const node = new ListNode(v);
    if (!head) head = node; else tail.next = node;
    tail = node;
  }
  return head;
}

function _buildListCyclic(arr, pos) {
  const nodes = arr.map((v) => new ListNode(v));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
  if (pos !== -1 && nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  return nodes.length ? nodes[0] : null;
}

function _serializeList(head) {
  const out = [];
  let seen = 0;
  while (head !== null && head !== undefined && seen < 200000) {
    out.push(head.val);
    head = head.next;
    seen++;
  }
  return out;
}

function _buildTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length) {
      const v = arr[i++];
      if (v !== null) { node.left = new TreeNode(v); queue.push(node.left); }
    }
    if (i < arr.length) {
      const v = arr[i++];
      if (v !== null) { node.right = new TreeNode(v); queue.push(node.right); }
    }
  }
  return root;
}

function _serializeTree(root) {
  if (!root) return [];
  const out = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!node) { out.push(null); continue; }
    out.push(node.val);
    queue.push(node.left);
    queue.push(node.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

function _findNode(root, val) {
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!node) continue;
    if (node.val === val) return node;
    queue.push(node.left);
    queue.push(node.right);
  }
  return null;
}

function _fmt(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "null";
  return JSON.stringify(value);
}

function _fmtFloat(value) {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
`;

/**
 * Wraps the user's `class Solution { ... }` code with stdin-parsing,
 * invocation, and stdout-printing logic so it can run directly on Judge0.
 */
export function buildJavascriptDriver(userCode: string, runner: RunnerMeta): string {
  const params = paramStatements(runner.params).map((l) => `  ${l}`);
  const args = runner.params.map((_, i) => `_p${i}`).join(", ");
  const callLine =
    runner.mutates !== undefined
      ? `  sol.${runner.method}(${args});`
      : `  const _result = sol.${runner.method}(${args});`;

  return `${PRELUDE}
${userCode}

function _main() {
  const _lines = require("fs").readFileSync(0, "utf8").split("\\n");
  let _idx = 0;
  function _nextLine() {
    return _idx < _lines.length ? _lines[_idx++] : "";
  }

${params.join("\n")}
  const sol = new Solution();
${callLine}
  ${outputStatement(runner)}
}

_main();
`;
}
