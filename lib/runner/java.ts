import type { PType, RunnerMeta } from "./types";

function resolveJavaType(t: PType, override?: string): string {
  if (override) return override;
  if (t === "int") return "int";
  if (t === "float") return "double";
  if (t === "bool") return "boolean";
  if (t === "str") return "String";
  if (t === "char") return "char";
  if (t === "listnode" || t === "listnode_cyclic") return "ListNode";
  if (t === "treenode" || t === "treenode_ref") return "TreeNode";
  if (typeof t === "object" && "list" in t) {
    if (t.list === "int") return "int[]";
    if (t.list === "str") return "String[]";
    if (t.list === "char") return "char[]";
    if (t.list === "listnode") return "ListNode[]";
    if (typeof t.list === "object" && "list" in t.list) {
      if (t.list.list === "int") return "int[][]";
      if (t.list.list === "str") return "String[][]";
      if (t.list.list === "char") return "char[][]";
    }
  }
  throw new Error(`Unsupported Java type: ${JSON.stringify(t)}`);
}

function paramStatements(params: PType[], overrides?: (string | undefined)[]): string[] {
  const lines: string[] = [];
  params.forEach((t, idx) => {
    const v = `_p${idx}`;
    const jt = resolveJavaType(t, overrides?.[idx]);
    if (t === "int") lines.push(`int ${v} = Integer.parseInt(_nextLine().trim());`);
    else if (t === "float") lines.push(`double ${v} = Double.parseDouble(_nextLine().trim());`);
    else if (t === "bool") lines.push(`boolean ${v} = _nextLine().trim().equals("true");`);
    else if (t === "str") lines.push(`String ${v} = _nextLine();`);
    else if (t === "listnode") lines.push(`ListNode ${v} = buildList(toIntArray(parseJson(_nextLine())));`);
    else if (t === "listnode_cyclic") {
      lines.push(`int[] _arr${idx} = toIntArray(parseJson(_nextLine()));`);
      lines.push(`int _pos${idx} = Integer.parseInt(_nextLine().trim());`);
      lines.push(`ListNode ${v} = buildListCyclic(_arr${idx}, _pos${idx});`);
    } else if (t === "treenode") lines.push(`TreeNode ${v} = buildTree(parseJson(_nextLine()));`);
    else if (t === "treenode_ref") lines.push(`TreeNode ${v} = findNode(_p0, Integer.parseInt(_nextLine().trim()));`);
    else if (typeof t === "object" && "list" in t) {
      if (t.list === "int") {
        lines.push(
          jt === "List<Integer>"
            ? `List<Integer> ${v} = toIntegerList(parseJson(_nextLine()));`
            : `int[] ${v} = toIntArray(parseJson(_nextLine()));`,
        );
      } else if (t.list === "str") {
        lines.push(
          jt === "List<String>"
            ? `List<String> ${v} = toStringList(parseJson(_nextLine()));`
            : `String[] ${v} = toStringArray(parseJson(_nextLine()));`,
        );
      } else if (t.list === "char") {
        lines.push(`char[] ${v} = toCharArray(parseJson(_nextLine()));`);
      } else if (t.list === "listnode") {
        lines.push(`JVal _j${idx} = parseJson(_nextLine());`);
        lines.push(`ListNode[] ${v} = new ListNode[_j${idx}.arr.size()];`);
        lines.push(`for (int _i = 0; _i < _j${idx}.arr.size(); _i++) ${v}[_i] = buildList(toIntArray(_j${idx}.arr.get(_i)));`);
      } else if (typeof t.list === "object" && "list" in t.list) {
        if (t.list.list === "int") {
          lines.push(
            jt === "List<List<Integer>>"
              ? `List<List<Integer>> ${v} = toIntegerList2D(parseJson(_nextLine()));`
              : `int[][] ${v} = toIntArray2D(parseJson(_nextLine()));`,
          );
        } else if (t.list.list === "str") {
          lines.push(
            jt === "List<List<String>>"
              ? `List<List<String>> ${v} = toStringList2D(parseJson(_nextLine()));`
              : `String[][] ${v} = toStringArray2D(parseJson(_nextLine()));`,
          );
        } else if (t.list.list === "char") {
          lines.push(`char[][] ${v} = toCharArray2D(parseJson(_nextLine()));`);
        } else throw new Error(`Unsupported nested list type: ${JSON.stringify(t)}`);
      } else throw new Error(`Unsupported list type: ${JSON.stringify(t)}`);
    } else {
      throw new Error(`Unsupported param type: ${JSON.stringify(t)}`);
    }
  });
  return lines;
}

function fmtExpr(t: PType, expr: string, override?: string): string {
  const jt = resolveJavaType(t, override);
  if (t === "int") return `String.valueOf(${expr})`;
  if (t === "float") return `Runner.fmtDouble(${expr})`;
  if (t === "bool") return `Runner.fmtBool(${expr})`;
  if (t === "str") return expr;
  if (typeof t === "object" && "list" in t) {
    if (t.list === "int") return jt === "List<Integer>" ? `Runner.fmtIntegerList(${expr})` : `Runner.fmtIntArray(${expr})`;
    if (t.list === "str") return jt === "List<String>" ? `Runner.fmtStringList(${expr})` : `Runner.fmtStringArray(${expr})`;
    if (typeof t.list === "object" && "list" in t.list) {
      if (t.list.list === "int") return jt === "List<List<Integer>>" ? `Runner.fmtIntegerList2D(${expr})` : `Runner.fmtIntArray2D(${expr})`;
      if (t.list.list === "str") return jt === "List<List<String>>" ? `Runner.fmtStringList2D(${expr})` : `Runner.fmtStringArray2D(${expr})`;
    }
  }
  throw new Error(`Unsupported output type: ${JSON.stringify(t)}`);
}

const PRELUDE = `import java.util.*;
import java.io.*;

class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; next = null; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int x) { val = x; left = null; right = null; }
}

class JVal {
    static final int NUL = 0, NUM = 1, STR = 2, ARR = 3, BOOLV = 4;
    int type = NUL;
    long num = 0;
    String str = "";
    boolean boolv = false;
    List<JVal> arr = new ArrayList<>();
}

class JParser {
    String s;
    int i = 0;
    JParser(String s) { this.s = s; }
    void skipWs() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
    JVal parse() {
        skipWs();
        if (i >= s.length()) return new JVal();
        char c = s.charAt(i);
        if (c == '[') return parseArr();
        if (c == '"') return parseStr();
        if (s.startsWith("true", i)) { i += 4; JVal v = new JVal(); v.type = JVal.BOOLV; v.boolv = true; return v; }
        if (s.startsWith("false", i)) { i += 5; JVal v = new JVal(); v.type = JVal.BOOLV; v.boolv = false; return v; }
        if (s.startsWith("null", i)) { i += 4; return new JVal(); }
        return parseNum();
    }
    JVal parseArr() {
        JVal v = new JVal(); v.type = JVal.ARR;
        i++;
        skipWs();
        if (i < s.length() && s.charAt(i) == ']') { i++; return v; }
        while (true) {
            v.arr.add(parse());
            skipWs();
            if (i < s.length() && s.charAt(i) == ',') { i++; skipWs(); continue; }
            break;
        }
        skipWs();
        if (i < s.length() && s.charAt(i) == ']') i++;
        return v;
    }
    JVal parseStr() {
        JVal v = new JVal(); v.type = JVal.STR;
        i++;
        StringBuilder out = new StringBuilder();
        while (i < s.length() && s.charAt(i) != '"') {
            if (s.charAt(i) == '\\\\' && i + 1 < s.length()) { out.append(s.charAt(i + 1)); i += 2; }
            else { out.append(s.charAt(i)); i++; }
        }
        if (i < s.length()) i++;
        v.str = out.toString();
        return v;
    }
    JVal parseNum() {
        int start = i;
        if (i < s.length() && (s.charAt(i) == '-' || s.charAt(i) == '+')) i++;
        while (i < s.length() && (Character.isDigit(s.charAt(i)) || s.charAt(i) == '.')) i++;
        JVal v = new JVal(); v.type = JVal.NUM;
        String tok = s.substring(start, i);
        v.num = tok.isEmpty() ? 0 : (long) Double.parseDouble(tok);
        return v;
    }
}

class Runner {
    static JVal parseJson(String line) { return new JParser(line).parse(); }

    static int[] toIntArray(JVal v) { int[] r = new int[v.arr.size()]; for (int i = 0; i < r.length; i++) r[i] = (int) v.arr.get(i).num; return r; }
    static int[][] toIntArray2D(JVal v) { int[][] r = new int[v.arr.size()][]; for (int i = 0; i < r.length; i++) r[i] = toIntArray(v.arr.get(i)); return r; }
    static String[] toStringArray(JVal v) { String[] r = new String[v.arr.size()]; for (int i = 0; i < r.length; i++) r[i] = v.arr.get(i).str; return r; }
    static String[][] toStringArray2D(JVal v) { String[][] r = new String[v.arr.size()][]; for (int i = 0; i < r.length; i++) r[i] = toStringArray(v.arr.get(i)); return r; }
    static char[] toCharArray(JVal v) { char[] r = new char[v.arr.size()]; for (int i = 0; i < r.length; i++) { String s = v.arr.get(i).str; r[i] = s.isEmpty() ? ' ' : s.charAt(0); } return r; }
    static char[][] toCharArray2D(JVal v) { char[][] r = new char[v.arr.size()][]; for (int i = 0; i < r.length; i++) r[i] = toCharArray(v.arr.get(i)); return r; }
    static List<Integer> toIntegerList(JVal v) { List<Integer> r = new ArrayList<>(); for (JVal x : v.arr) r.add((int) x.num); return r; }
    static List<String> toStringList(JVal v) { List<String> r = new ArrayList<>(); for (JVal x : v.arr) r.add(x.str); return r; }
    static List<List<Integer>> toIntegerList2D(JVal v) { List<List<Integer>> r = new ArrayList<>(); for (JVal x : v.arr) r.add(toIntegerList(x)); return r; }
    static List<List<String>> toStringList2D(JVal v) { List<List<String>> r = new ArrayList<>(); for (JVal x : v.arr) r.add(toStringList(x)); return r; }

    static ListNode buildList(int[] arr) {
        ListNode head = null, tail = null;
        for (int v : arr) {
            ListNode node = new ListNode(v);
            if (head == null) head = node; else tail.next = node;
            tail = node;
        }
        return head;
    }
    static ListNode buildListCyclic(int[] arr, int pos) {
        ListNode[] nodes = new ListNode[arr.length];
        for (int i = 0; i < arr.length; i++) nodes[i] = new ListNode(arr[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (pos != -1 && nodes.length > 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes.length > 0 ? nodes[0] : null;
    }
    static int[] serializeList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        int seen = 0;
        while (head != null && seen < 200000) { out.add(head.val); head = head.next; seen++; }
        int[] r = new int[out.size()];
        for (int i = 0; i < r.length; i++) r[i] = out.get(i);
        return r;
    }
    static TreeNode buildTree(JVal v) {
        if (v.arr.isEmpty() || v.arr.get(0).type == JVal.NUL) return null;
        TreeNode root = new TreeNode((int) v.arr.get(0).num);
        List<TreeNode> queue = new ArrayList<>();
        queue.add(root);
        int i = 1, qi = 0;
        while (qi < queue.size() && i < v.arr.size()) {
            TreeNode node = queue.get(qi++);
            if (i < v.arr.size()) {
                JVal x = v.arr.get(i++);
                if (x.type != JVal.NUL) { node.left = new TreeNode((int) x.num); queue.add(node.left); }
            }
            if (i < v.arr.size()) {
                JVal x = v.arr.get(i++);
                if (x.type != JVal.NUL) { node.right = new TreeNode((int) x.num); queue.add(node.right); }
            }
        }
        return root;
    }
    static List<String> serializeTreeRaw(TreeNode root) {
        List<String> out = new ArrayList<>();
        if (root == null) return out;
        List<TreeNode> queue = new ArrayList<>();
        queue.add(root);
        int qi = 0;
        while (qi < queue.size()) {
            TreeNode node = queue.get(qi++);
            if (node == null) { out.add("null"); continue; }
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return out;
    }
    static TreeNode findNode(TreeNode root, int val) {
        List<TreeNode> queue = new ArrayList<>();
        queue.add(root);
        int qi = 0;
        while (qi < queue.size()) {
            TreeNode node = queue.get(qi++);
            if (node == null) continue;
            if (node.val == val) return node;
            queue.add(node.left);
            queue.add(node.right);
        }
        return null;
    }

    static String fmtIntArray(int[] v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.length; i++) { if (i > 0) s.append(","); s.append(v[i]); } s.append("]"); return s.toString(); }
    static String fmtIntArray2D(int[][] v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.length; i++) { if (i > 0) s.append(","); s.append(fmtIntArray(v[i])); } s.append("]"); return s.toString(); }
    static String fmtStringArray(String[] v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.length; i++) { if (i > 0) s.append(","); s.append("\\"").append(v[i]).append("\\""); } s.append("]"); return s.toString(); }
    static String fmtStringArray2D(String[][] v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.length; i++) { if (i > 0) s.append(","); s.append(fmtStringArray(v[i])); } s.append("]"); return s.toString(); }
    static String fmtIntegerList(List<Integer> v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.size(); i++) { if (i > 0) s.append(","); s.append(v.get(i)); } s.append("]"); return s.toString(); }
    static String fmtStringList(List<String> v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.size(); i++) { if (i > 0) s.append(","); s.append("\\"").append(v.get(i)).append("\\""); } s.append("]"); return s.toString(); }
    static String fmtIntegerList2D(List<List<Integer>> v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.size(); i++) { if (i > 0) s.append(","); s.append(fmtIntegerList(v.get(i))); } s.append("]"); return s.toString(); }
    static String fmtStringList2D(List<List<String>> v) { StringBuilder s = new StringBuilder("["); for (int i = 0; i < v.size(); i++) { if (i > 0) s.append(","); s.append(fmtStringList(v.get(i))); } s.append("]"); return s.toString(); }
    static String fmtBool(boolean b) { return b ? "true" : "false"; }
    static String fmtDouble(double d) {
        if (d == (long) d) return String.valueOf((long) d) + ".0";
        return String.valueOf(d);
    }
    static String fmtTreeTokens(List<String> toks) {
        StringBuilder s = new StringBuilder("[");
        for (int i = 0; i < toks.size(); i++) { if (i > 0) s.append(","); s.append(toks.get(i)); }
        s.append("]");
        return s.toString();
    }
}
`;

/**
 * Wraps the user's `class Solution { ... }` code with a Main entry point
 * that parses stdin test-case lines and calls the solution method. Java
 * starter code mixes array (int[]/String[]) and List<...> styles per
 * problem — javaParamTypes/javaReturnType overrides in RunnerMeta capture
 * which style each problem actually uses.
 */
export function buildJavaDriver(userCode: string, runner: RunnerMeta): string {
  // Only one public top-level class is allowed per file (Main); the
  // starter code for a couple of problems declares "public class Solution".
  const normalizedUserCode = userCode.replace(/public\s+class\s+Solution/, "class Solution");

  const params = paramStatements(runner.params, runner.javaParamTypes).map((l) => `        ${l}`);
  const args = runner.params.map((_, i) => `_p${i}`).join(", ");
  const callLine =
    runner.mutates !== undefined
      ? `        sol.${runner.method}(${args});`
      : `        var _result = sol.${runner.method}(${args});`;

  let outputLine: string;
  if (runner.mutates !== undefined) {
    const mutatedType = runner.params[runner.mutates];
    const override = runner.javaParamTypes?.[runner.mutates];
    outputLine = `        System.out.println(${fmtExpr(mutatedType, `_p${runner.mutates}`, override)});`;
  } else if (runner.returns === "listnode") {
    outputLine = `        System.out.println(Runner.fmtIntArray(Runner.serializeList(_result)));`;
  } else if (runner.returns === "treenode") {
    outputLine = `        System.out.println(Runner.fmtTreeTokens(Runner.serializeTreeRaw(_result)));`;
  } else if (runner.returns === "treenode_val") {
    outputLine = `        System.out.println(_result != null ? String.valueOf(_result.val) : "null");`;
  } else {
    outputLine = `        System.out.println(${fmtExpr(runner.returns, "_result", runner.javaReturnType)});`;
  }

  // fmtExpr/param helpers reference bare function names but they're static
  // members of Runner — qualify parse-side calls too (parseJson, toXxx).
  const qualifiedParams = params.map((l) =>
    l.replace(
      /\b(parseJson|toIntArray2D|toIntArray|toStringArray2D|toStringArray|toCharArray2D|toCharArray|toIntegerList2D|toIntegerList|toStringList2D|toStringList|buildList|buildListCyclic|buildTree|findNode)\(/g,
      "Runner.$1(",
    ),
  );

  return `${PRELUDE}
${normalizedUserCode}

public class Main {
    static String[] _lines;
    static int _idx = 0;
    static String _nextLine() {
        return _idx < _lines.length ? _lines[_idx++] : "";
    }

    public static void main(String[] args) throws Exception {
        StringBuilder all = new StringBuilder();
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int c;
        while ((c = br.read()) != -1) all.append((char) c);
        _lines = all.toString().split("\\n", -1);

${qualifiedParams.join("\n")}
        Solution sol = new Solution();
${callLine}
${outputLine}
    }
}
`;
}
