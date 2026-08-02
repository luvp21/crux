import type { PType, RunnerMeta } from "./types";

function cppType(t: PType): string {
  if (t === "int") return "int";
  if (t === "float") return "double";
  if (t === "bool") return "bool";
  if (t === "str") return "string";
  if (t === "listnode" || t === "listnode_cyclic") return "ListNode*";
  if (t === "treenode" || t === "treenode_ref") return "TreeNode*";
  if (typeof t === "object" && "list" in t) {
    if (t.list === "int") return "vector<int>";
    if (t.list === "str") return "vector<string>";
    if (t.list === "char") return "vector<char>";
    if (t.list === "listnode") return "vector<ListNode*>";
    if (typeof t.list === "object" && "list" in t.list) {
      if (t.list.list === "int") return "vector<vector<int>>";
      if (t.list.list === "str") return "vector<vector<string>>";
      if (t.list.list === "char") return "vector<vector<char>>";
    }
  }
  throw new Error(`Unsupported C++ type: ${JSON.stringify(t)}`);
}

function paramStatements(params: PType[]): string[] {
  const lines: string[] = [];
  params.forEach((t, idx) => {
    const v = `_p${idx}`;
    if (t === "int") lines.push(`int ${v} = stoll(_nextLine());`);
    else if (t === "float") lines.push(`double ${v} = stod(_nextLine());`);
    else if (t === "bool") lines.push(`bool ${v} = (_nextLine() == "true");`);
    else if (t === "str") lines.push(`string ${v} = _nextLine();`);
    else if (t === "listnode") lines.push(`ListNode* ${v} = buildList(toVecInt(parseJson(_nextLine())));`);
    else if (t === "listnode_cyclic") {
      lines.push(`vector<int> _arr${idx} = toVecInt(parseJson(_nextLine()));`);
      lines.push(`int _pos${idx} = stoll(_nextLine());`);
      lines.push(`ListNode* ${v} = buildListCyclic(_arr${idx}, _pos${idx});`);
    } else if (t === "treenode") lines.push(`TreeNode* ${v} = buildTree(parseJson(_nextLine()));`);
    else if (t === "treenode_ref") lines.push(`TreeNode* ${v} = findNode(_p0, stoll(_nextLine()));`);
    else if (typeof t === "object" && "list" in t) {
      if (t.list === "int") lines.push(`vector<int> ${v} = toVecInt(parseJson(_nextLine()));`);
      else if (t.list === "str") lines.push(`vector<string> ${v} = toVecStr(parseJson(_nextLine()));`);
      else if (t.list === "listnode") {
        lines.push(`JVal _j${idx} = parseJson(_nextLine());`);
        lines.push(`vector<ListNode*> ${v};`);
        lines.push(`for (auto &_x : _j${idx}.arr) ${v}.push_back(buildList(toVecInt(_x)));`);
      } else if (t.list === "char") lines.push(`vector<char> ${v} = toVecChar(parseJson(_nextLine()));`);
      else if (typeof t.list === "object" && "list" in t.list) {
        if (t.list.list === "int") lines.push(`vector<vector<int>> ${v} = toVecVecInt(parseJson(_nextLine()));`);
        else if (t.list.list === "str") lines.push(`vector<vector<string>> ${v} = toVecVecStr(parseJson(_nextLine()));`);
        else if (t.list.list === "char") lines.push(`vector<vector<char>> ${v} = toVecVecChar(parseJson(_nextLine()));`);
        else throw new Error(`Unsupported nested list type: ${JSON.stringify(t)}`);
      } else throw new Error(`Unsupported list type: ${JSON.stringify(t)}`);
    } else {
      throw new Error(`Unsupported param type: ${JSON.stringify(t)}`);
    }
  });
  return lines;
}

function fmtExpr(t: PType, expr: string): string {
  if (t === "int") return `to_string(${expr})`;
  if (t === "float") return `fmtFloat(${expr})`;
  if (t === "bool") return `fmtBool(${expr})`;
  if (t === "str") return expr;
  if (typeof t === "object" && "list" in t) {
    if (t.list === "int") return `fmtVecInt(${expr})`;
    if (t.list === "str") return `fmtVecStr(${expr})`;
    if (typeof t.list === "object" && "list" in t.list) {
      if (t.list.list === "int") return `fmtVecVecInt(${expr})`;
      if (t.list.list === "str") return `fmtVecVecStr(${expr})`;
    }
  }
  throw new Error(`Unsupported output type: ${JSON.stringify(t)}`);
}

const PRELUDE = `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

struct JVal {
    enum Type { NUL, NUM, STR, ARR, BOOLV } type = NUL;
    long long num = 0;
    string str;
    bool boolv = false;
    vector<JVal> arr;
};

struct JParser {
    const string &s;
    size_t i = 0;
    JParser(const string &s_) : s(s_) {}
    void skipWs() { while (i < s.size() && isspace((unsigned char)s[i])) i++; }
    JVal parse() {
        skipWs();
        if (i >= s.size()) return JVal();
        if (s[i] == '[') return parseArr();
        if (s[i] == '"') return parseStr();
        if (s.compare(i, 4, "true") == 0) { i += 4; JVal v; v.type = JVal::BOOLV; v.boolv = true; return v; }
        if (s.compare(i, 5, "false") == 0) { i += 5; JVal v; v.type = JVal::BOOLV; v.boolv = false; return v; }
        if (s.compare(i, 4, "null") == 0) { i += 4; return JVal(); }
        return parseNum();
    }
    JVal parseArr() {
        JVal v; v.type = JVal::ARR;
        i++;
        skipWs();
        if (i < s.size() && s[i] == ']') { i++; return v; }
        while (true) {
            v.arr.push_back(parse());
            skipWs();
            if (i < s.size() && s[i] == ',') { i++; skipWs(); continue; }
            break;
        }
        skipWs();
        if (i < s.size() && s[i] == ']') i++;
        return v;
    }
    JVal parseStr() {
        JVal v; v.type = JVal::STR;
        i++;
        string out;
        while (i < s.size() && s[i] != '"') {
            if (s[i] == '\\\\' && i + 1 < s.size()) { out += s[i + 1]; i += 2; }
            else { out += s[i]; i++; }
        }
        if (i < s.size()) i++;
        v.str = out;
        return v;
    }
    JVal parseNum() {
        size_t start = i;
        if (i < s.size() && (s[i] == '-' || s[i] == '+')) i++;
        while (i < s.size() && (isdigit((unsigned char)s[i]) || s[i] == '.')) i++;
        JVal v; v.type = JVal::NUM;
        v.num = s.substr(start, i - start).empty() ? 0 : stoll(s.substr(start, i - start));
        return v;
    }
};

JVal parseJson(const string &line) { JParser p(line); return p.parse(); }

vector<int> toVecInt(const JVal &v) { vector<int> r; for (auto &x : v.arr) r.push_back((int)x.num); return r; }
vector<vector<int>> toVecVecInt(const JVal &v) { vector<vector<int>> r; for (auto &x : v.arr) r.push_back(toVecInt(x)); return r; }
vector<string> toVecStr(const JVal &v) { vector<string> r; for (auto &x : v.arr) r.push_back(x.str); return r; }
vector<vector<string>> toVecVecStr(const JVal &v) { vector<vector<string>> r; for (auto &x : v.arr) r.push_back(toVecStr(x)); return r; }
vector<char> toVecChar(const JVal &v) { vector<char> r; for (auto &x : v.arr) r.push_back(x.str.empty() ? ' ' : x.str[0]); return r; }
vector<vector<char>> toVecVecChar(const JVal &v) { vector<vector<char>> r; for (auto &x : v.arr) r.push_back(toVecChar(x)); return r; }

ListNode* buildList(const vector<int> &arr) {
    ListNode *head = nullptr, *tail = nullptr;
    for (int v : arr) {
        ListNode *node = new ListNode(v);
        if (!head) head = node; else tail->next = node;
        tail = node;
    }
    return head;
}
ListNode* buildListCyclic(const vector<int> &arr, int pos) {
    vector<ListNode*> nodes;
    for (int v : arr) nodes.push_back(new ListNode(v));
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    if (pos != -1 && !nodes.empty()) nodes.back()->next = nodes[pos];
    return nodes.empty() ? nullptr : nodes[0];
}
vector<int> serializeList(ListNode *head) {
    vector<int> out;
    int seen = 0;
    while (head && seen < 200000) { out.push_back(head->val); head = head->next; seen++; }
    return out;
}
TreeNode* buildTree(const JVal &v) {
    if (v.arr.empty() || v.arr[0].type == JVal::NUL) return nullptr;
    TreeNode *root = new TreeNode((int)v.arr[0].num);
    vector<TreeNode*> queue = { root };
    size_t i = 1, qi = 0;
    while (qi < queue.size() && i < v.arr.size()) {
        TreeNode *node = queue[qi++];
        if (i < v.arr.size()) {
            if (v.arr[i].type != JVal::NUL) { node->left = new TreeNode((int)v.arr[i].num); queue.push_back(node->left); }
            i++;
        }
        if (i < v.arr.size()) {
            if (v.arr[i].type != JVal::NUL) { node->right = new TreeNode((int)v.arr[i].num); queue.push_back(node->right); }
            i++;
        }
    }
    return root;
}
vector<string> serializeTreeRaw(TreeNode *root) {
    vector<string> out;
    if (!root) return out;
    vector<TreeNode*> queue = { root };
    size_t qi = 0;
    while (qi < queue.size()) {
        TreeNode *node = queue[qi++];
        if (!node) { out.push_back("null"); continue; }
        out.push_back(to_string(node->val));
        queue.push_back(node->left);
        queue.push_back(node->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    return out;
}
TreeNode* findNode(TreeNode *root, int val) {
    vector<TreeNode*> queue = { root };
    size_t qi = 0;
    while (qi < queue.size()) {
        TreeNode *node = queue[qi++];
        if (!node) continue;
        if (node->val == val) return node;
        queue.push_back(node->left);
        queue.push_back(node->right);
    }
    return nullptr;
}

string fmtVecInt(const vector<int> &v) { string s = "["; for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += to_string(v[i]); } s += "]"; return s; }
string fmtVecVecInt(const vector<vector<int>> &v) { string s = "["; for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += fmtVecInt(v[i]); } s += "]"; return s; }
string fmtVecStr(const vector<string> &v) { string s = "["; for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += "\\"" + v[i] + "\\""; } s += "]"; return s; }
string fmtVecVecStr(const vector<vector<string>> &v) { string s = "["; for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += fmtVecStr(v[i]); } s += "]"; return s; }
string fmtBool(bool b) { return b ? "true" : "false"; }
string fmtFloat(double d) {
    if (d == (long long)d) return to_string((long long)d) + ".0";
    ostringstream oss; oss << d; return oss.str();
}
string fmtTreeTokens(const vector<string> &toks) {
    string s = "[";
    for (size_t i = 0; i < toks.size(); i++) { if (i) s += ","; s += toks[i]; }
    s += "]";
    return s;
}
`;

/**
 * Wraps the user's `class Solution { ... };` code with a main() that
 * parses stdin test-case lines (via a small hand-rolled JSON-ish parser —
 * no library JSON available in Judge0's C++ 17), calls the solution
 * method, and prints the result in the same format as Python/JS drivers.
 */
export function buildCppDriver(userCode: string, runner: RunnerMeta): string {
  const params = paramStatements(runner.params).map((l) => `    ${l}`);
  const args = runner.params.map((_, i) => `_p${i}`).join(", ");
  const callLine =
    runner.mutates !== undefined
      ? `    sol.${runner.method}(${args});`
      : `    auto _result = sol.${runner.method}(${args});`;

  let outputLine: string;
  if (runner.mutates !== undefined) {
    const mutatedType = runner.params[runner.mutates];
    outputLine = `    cout << ${fmtExpr(mutatedType, `_p${runner.mutates}`)} << endl;`;
  } else if (runner.returns === "listnode") {
    outputLine = `    cout << fmtVecInt(serializeList(_result)) << endl;`;
  } else if (runner.returns === "treenode") {
    outputLine = `    cout << fmtTreeTokens(serializeTreeRaw(_result)) << endl;`;
  } else if (runner.returns === "treenode_val") {
    outputLine = `    cout << (_result ? to_string(_result->val) : string("null")) << endl;`;
  } else {
    outputLine = `    cout << ${fmtExpr(runner.returns, "_result")} << endl;`;
  }

  return `${PRELUDE}
${userCode}

string _nextLine() {
    static vector<string> lines;
    static size_t idx = 0;
    static bool loaded = false;
    if (!loaded) {
        string all((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
        size_t start = 0;
        for (size_t i = 0; i <= all.size(); i++) {
            if (i == all.size() || all[i] == '\\n') {
                lines.push_back(all.substr(start, i - start));
                start = i + 1;
            }
        }
        loaded = true;
    }
    return idx < lines.size() ? lines[idx++] : "";
}

int main() {
${params.join("\n")}
    Solution sol;
${callLine}
${outputLine}
    return 0;
}
`;
}
