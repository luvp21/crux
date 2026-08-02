/**
 * Internal type vocabulary used to generate per-language "driver" code that
 * parses stdin test-case lines, calls the user's Solution method, and
 * prints the result in the exact format problems.testCases[].expected uses
 * (lowercase booleans, compact JSON arrays, raw strings, native float repr).
 */
export type PType =
  | "int"
  | "float"
  | "bool"
  | "str"
  | "char"
  | "void"
  | "listnode"
  | "listnode_cyclic"
  | "treenode"
  | "treenode_ref"
  | "treenode_val"
  | { list: PType };

export interface RunnerMeta {
  method: string;
  params: PType[];
  returns: PType;
  /** Index into params: if set, the driver prints this param's post-call
   *  state instead of the return value (in-place mutation problems). */
  mutates?: number;
  /** Java starter code mixes int[]/String[] and List<Integer>/List<String>
   *  inconsistently across problems (matching common LeetCode convention
   *  per-problem, not a fixed rule) — override the default array-style
   *  Java type mapping per param/return when the starter code uses a
   *  List<...> instead. */
  javaParamTypes?: (string | undefined)[];
  javaReturnType?: string;
}
