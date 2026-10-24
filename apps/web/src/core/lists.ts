// Finding lists inside a pretty-printed goal, for the List Lab.

export type ListLiteral = Readonly<{ start: number; end: number; items: readonly string[] }>;

/** Split on top-level commas, ignoring commas inside (), [], ⟨⟩, {}. */
function splitTopLevel(s: string, sep: string): readonly string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if ('([{⟨'.includes(c)) depth++;
    else if (')]}⟩'.includes(c)) depth--;
    if (depth === 0 && s.startsWith(sep, i)) {
      parts.push(cur);
      cur = '';
      i += sep.length - 1;
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

/** Every `[a, b, c]` literal in the text, outermost only. `[]` has no items. */
export function parseListLiterals(text: string): readonly ListLiteral[] {
  const out: ListLiteral[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '[') {
      i++;
      continue;
    }
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === '[') depth++;
      else if (text[j] === ']' && --depth === 0) break;
    }
    if (j >= text.length) break;
    const inner = text.slice(i + 1, j).trim();
    out.push({ start: i, end: j + 1, items: inner === '' ? [] : splitTopLevel(inner, ',') });
    i = j + 1;
  }
  return out;
}

/** The first list literal, or undefined. Kept for callers that only care about one. */
export const parseListLiteral = (text: string): ListLiteral | undefined => parseListLiterals(text)[0];

export const hasConcreteList = (text: string): boolean =>
  parseListLiterals(text).some((l) => l.items.length > 0);

/**
 * A goal's list content, as a row of cells. Literal items become `item` cells; anything
 * else between them (`app (rev`, `::`, `++ rest`) becomes a `glue` cell, so the reader
 * can still see the structure the items sit in.
 */
export type ListCell = Readonly<
  { kind: 'item'; text: string; key: string } | { kind: 'glue'; text: string; key: string }
>;

export function listCells(expr: string): readonly ListCell[] {
  const seen = new Map<string, number>();
  const keyFor = (text: string): string => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return `${text}#${n}`;
  };
  const literals = parseListLiterals(expr);
  const cells: ListCell[] = [];
  let pos = 0;
  const glue = (s: string) => {
    for (const part of splitConsItems(s)) {
      if (part.kind === 'item') cells.push({ kind: 'item', text: part.text, key: keyFor(part.text) });
      else if (part.text.trim()) cells.push({ kind: 'glue', text: part.text.trim(), key: `glue:${cells.length}` });
    }
  };
  for (const lit of literals) {
    glue(expr.slice(pos, lit.start));
    if (lit.items.length === 0) cells.push({ kind: 'glue', text: '[]', key: `glue:${cells.length}` });
    for (const item of lit.items) cells.push({ kind: 'item', text: item, key: keyFor(item) });
    pos = lit.end;
  }
  glue(expr.slice(pos));
  return cells;
}

/** `3 :: 2 :: rest` -> items 3, 2 and glue `rest`. Plain text with no `::` is glue. */
function splitConsItems(s: string): readonly Readonly<{ kind: 'item' | 'glue'; text: string }>[] {
  if (!s.includes('::')) return [{ kind: 'glue', text: s }];
  const parts = s.split('::');
  return parts.flatMap((p, i) => {
    const t = p.trim();
    if (i === parts.length - 1) return [{ kind: 'glue' as const, text: t }];
    // The cons head is the last atom before `::`; whatever precedes it is glue.
    const m = /^(.*?)([\w'.]+)\s*$/.exec(t);
    return m
      ? [
          { kind: 'glue' as const, text: m[1] ?? '' },
          { kind: 'item' as const, text: m[2]! },
        ]
      : [{ kind: 'glue' as const, text: t }];
  });
}

/**
 * A symbolic chain for goals with no concrete list: `compile a ++ (compile b ++ rest)` ->
 * the top-level `++` / `::` operands, with one level of parentheses opened up.
 */
export function chainLinks(expr: string): readonly string[] {
  const unparen = (s: string) => (s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1).trim() : s);
  const split = (s: string): readonly string[] => {
    const parts = splitTopLevel(s, ' ++ ').flatMap((p) => splitTopLevel(p, ' :: '));
    return parts.length > 1 ? parts.flatMap((p) => (p.startsWith('(') ? split(unparen(p)) : [p])) : [s];
  };
  return split(expr.trim());
}

/** Split `lhs = rhs` at the top-level `=`; other goals come back as a single side. */
export function sides(target: string): readonly string[] {
  const parts = splitTopLevel(target, ' = ');
  return parts.length === 2 ? parts : [target];
}
