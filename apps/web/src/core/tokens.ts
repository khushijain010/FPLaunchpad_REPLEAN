// Token-level diff of two goal strings, for the Rewrite lens and goal panel.

export type DiffOp = Readonly<{ kind: 'same' | 'add' | 'del'; text: string }>;

/** Identifiers (with dots and primes), numbers, whitespace runs, or single symbols. */
export function tokenize(s: string): readonly string[] {
  return s.match(/[\p{L}_][\p{L}\p{N}_'.!?₀-₉]*|\d+|\s+|./gu) ?? [];
}

/** Longest-common-subsequence diff over tokens. Goals are short, so O(n·m) is fine. */
export function tokenDiff(before: string, after: string): readonly DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const ops: DiffOp[] = [];
  const push = (kind: DiffOp['kind'], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.kind === kind) ops[ops.length - 1] = { kind, text: last.text + text };
    else ops.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i]!);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) push('del', a[i++]!);
    else push('add', b[j++]!);
  }
  while (i < a.length) push('del', a[i++]!);
  while (j < b.length) push('add', b[j++]!);
  return ops;
}

/** The changed region of a diff: what was matched (deleted text) and what replaced it. */
export function rewriteSummary(ops: readonly DiffOp[]): Readonly<{ from: string; to: string }> {
  const from = ops.filter((o) => o.kind === 'del').map((o) => o.text).join(' … ').trim();
  const to = ops.filter((o) => o.kind === 'add').map((o) => o.text).join(' … ').trim();
  return { from, to };
}
