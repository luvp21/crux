import type { PType, RunnerMeta } from "./types";

function needsBuild(t: PType): boolean {
  if (t === "listnode" || t === "treenode") return true;
  if (typeof t === "object" && "list" in t) return needsBuild(t.list);
  return false;
}

function transform(t: PType, rawExpr: string): string {
  if (typeof t === "object" && "list" in t) {
    if (!needsBuild(t.list)) return rawExpr;
    return `[${transform(t.list, "_x")} for _x in ${rawExpr}]`;
  }
  if (t === "listnode") return `_build_list(${rawExpr})`;
  if (t === "treenode") return `_build_tree(${rawExpr})`;
  return rawExpr;
}

function paramStatements(params: PType[]): string[] {
  const lines: string[] = [];
  params.forEach((t, idx) => {
    const v = `_p${idx}`;
    if (t === "int") lines.push(`${v} = int(_next_line().strip())`);
    else if (t === "float") lines.push(`${v} = float(_next_line().strip())`);
    else if (t === "bool") lines.push(`${v} = _next_line().strip() == "true"`);
    else if (t === "str") lines.push(`${v} = _next_line()`);
    else if (t === "listnode") lines.push(`${v} = _build_list(json.loads(_next_line()))`);
    else if (t === "listnode_cyclic") {
      lines.push(`_arr${idx} = json.loads(_next_line())`);
      lines.push(`_pos${idx} = int(_next_line().strip())`);
      lines.push(`${v} = _build_list_cyclic(_arr${idx}, _pos${idx})`);
    } else if (t === "treenode") lines.push(`${v} = _build_tree(json.loads(_next_line()))`);
    else if (t === "treenode_ref") lines.push(`${v} = _find_node(_p0, int(_next_line().strip()))`);
    else if (typeof t === "object" && "list" in t) {
      lines.push(`${v} = ${transform(t, "json.loads(_next_line())")}`);
    } else {
      throw new Error(`Unsupported param type: ${JSON.stringify(t)}`);
    }
  });
  return lines;
}

function outputStatement(runner: RunnerMeta): string {
  if (runner.mutates !== undefined) {
    return `print(_fmt(_p${runner.mutates}))`;
  }
  const r = runner.returns;
  if (r === "listnode") return `print(_fmt(_serialize_list(_result)))`;
  if (r === "treenode") return `print(_fmt(_serialize_tree(_result)))`;
  if (r === "treenode_val") return `print(_fmt(_result.val) if _result is not None else "null")`;
  return `print(_fmt(_result))`;
}

const PRELUDE = `import sys, json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _build_list(arr):
    head = None
    tail = None
    for v in arr:
        node = ListNode(v)
        if head is None:
            head = node
        else:
            tail.next = node
        tail = node
    return head

def _build_list_cyclic(arr, pos):
    nodes = [ListNode(v) for v in arr]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos != -1 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def _serialize_list(head):
    out = []
    seen = 0
    while head is not None and seen < 200000:
        out.append(head.val)
        head = head.next
        seen += 1
    return out

def _build_tree(arr):
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr):
            v = arr[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(arr):
            v = arr[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def _serialize_tree(root):
    if root is None:
        return []
    out = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _find_node(root, val):
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            continue
        if node.val == val:
            return node
        queue.append(node.left)
        queue.append(node.right)
    return None

def _fmt(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, str):
        return value
    if value is None:
        return "null"
    return json.dumps(value, separators=(",", ":"))
`;

/**
 * Wraps the user's `class Solution:` code with parsing/invocation/printing
 * logic so it can be run directly against stdin test-case lines on Judge0.
 * `from __future__ import annotations` defers evaluation of the modern
 * `list[int]` / `Optional[X]` style type hints in starter code — Judge0's
 * Python is 3.8.1, which crashes on those at class-definition time
 * otherwise.
 */
export function buildPythonDriver(userCode: string, runner: RunnerMeta): string {
  const params = paramStatements(runner.params).map((l) => `    ${l}`);
  const args = runner.params.map((_, i) => `_p${i}`).join(", ");
  const callLine =
    runner.mutates !== undefined
      ? `    sol.${runner.method}(${args})`
      : `    _result = sol.${runner.method}(${args})`;

  return `from __future__ import annotations
${PRELUDE}
${userCode}

def _main():
    _lines = sys.stdin.read().split("\\n")
    _idx = 0
    def _next_line():
        nonlocal _idx
        line = _lines[_idx] if _idx < len(_lines) else ""
        _idx += 1
        return line

${params.join("\n")}
    sol = Solution()
${callLine}
    ${outputStatement(runner)}

_main()
`;
}
