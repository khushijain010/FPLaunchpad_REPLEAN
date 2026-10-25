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

/**
 * What was replaced by what, as separate pieces rather than one string. Changes separated only by
 * whitespace are one piece (`Expr.num` + `n` is `Expr.num n`), and a piece that changes the same
 * way twice (both sides of an `=`) is listed once.
 */
export function rewriteSummary(ops: readonly DiffOp[]): Readonly<{ from: readonly string[]; to: readonly string[] }> {
  const from: string[] = [];
  const to: string[] = [];
  let del = '';
  let add = '';
  let gap = false;
  const flush = () => {
    if (del.trim()) from.push(del.trim());
    if (add.trim()) to.push(add.trim());
    del = '';
    add = '';
    gap = false;
  };
  for (const o of ops) {
    if (o.kind === 'same') {
      // Whitespace between two changes keeps them together; anything else ends the piece.
      if (/^\s+$/.test(o.text) && (del || add)) gap = true;
      else flush();
    } else if (o.kind === 'del') {
      del += (gap && del ? ' ' : '') + o.text;
    } else {
      add += (gap && add ? ' ' : '') + o.text;
    }
  }
  flush();
  return { from: [...new Set(from)], to: [...new Set(to)] };
}
