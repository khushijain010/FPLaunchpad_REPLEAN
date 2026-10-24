// Small pure helpers for reading tactic text.

const BULLET = /^[·.]\s*/;
const CASE_PREFIX = /^(?:case|case')\s+[^=]*=>\s*/;
const NEXT_PREFIX = /^next\b[^=]*=>\s*/;
const ALT_PREFIX = /^\|[^=]*=>\s*/;
const WORD = /^[A-Za-z_][A-Za-z0-9_'!?]*/;

/** Strip a trailing `-- comment` (outside of string literals, which tactic lines rarely have). */
export function stripComment(line: string): string {
  const i = line.indexOf('--');
  return (i >= 0 ? line.slice(0, i) : line).trimEnd();
}

export function startsWithBullet(text: string): boolean {
  return BULLET.test(text.trimStart()) && !text.trimStart().startsWith('..');
}

/**
 * The name of the first real tactic on a line: `· exact h.2` -> "exact",
 * `case succ k ih => rw [ih]` -> "rw", `case succ k ih =>` -> "case".
 */
export function headTactic(text: string): string {
  let rest = text.trim();
  for (;;) {
    const before = rest;
    rest = rest.replace(BULLET, '');
    if (/^(case|case'|next)\b/.test(rest) && !/=>\s*\S/.test(rest)) {
      return rest.startsWith('next') ? 'next' : 'case';
    }
    rest = rest.replace(CASE_PREFIX, '').replace(NEXT_PREFIX, '').replace(ALT_PREFIX, '');
    if (rest === before) break;
  }
  const m = WORD.exec(rest);
  if (m) return m[0];
  if (rest.startsWith('·') || rest === '') return 'bullet';
  return rest.split(/\s+/)[0] ?? '';
}

/** Identifiers mentioned in a tactic line, used to guess which hypotheses it used. */
export function mentionedNames(text: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const m of stripComment(text).matchAll(/[A-Za-z_À-ɏͰ-Ͽ][A-Za-z0-9_'À-ɏͰ-Ͽ₀-₉]*/g)) {
    names.add(m[0]);
  }
  return names;
}

/** The statement of the last `theorem`/`lemma` in a file, whitespace collapsed. */
export function extractTheorem(source: string): string {
  const re = /(?:^|\n)\s*(?:theorem|lemma)\s+([\s\S]*?):=/g;
  let last = '';
  for (const m of source.matchAll(re)) last = m[1] ?? '';
  return last.replace(/\s+/g, ' ').trim();
}
