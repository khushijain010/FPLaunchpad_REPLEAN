// A small Lean 4 tokenizer for CodeMirror: keywords, tactics, comments, numbers, unicode symbols.
// It doesn't parse Lean; it only has to colour five short files well.

import { HighlightStyle, StreamLanguage, type StringStream } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const KEYWORDS = new Set(
  'theorem lemma def example namespace end open section variable inductive structure where match with fun by do let in have show from at if then else instance class deriving import universe abbrev private protected noncomputable partial termination_by decreasing_by generalizing using'.split(' '),
);
const TACTICS = new Set(
  'intro intros exact apply constructor cases rcases obtain induction rw rewrite simp simp_all dsimp unfold omega rfl decide contradiction exfalso left right case next sorry trivial assumption calc refine use specialize generalize exists only all_goals any_goals first repeat try skip'.split(' '),
);
const SORTS = new Set(['Prop', 'Type', 'Sort', 'Nat', 'Int', 'List', 'Bool', 'String', 'True', 'False']);
const SYMBOLS = /^(?:[∧∨¬→↔∀∃λ⊢≠≤≥×∘∈⟨⟩·↦▸]|:=|=>|<;>|::|\+\+|[=<>+*\-/|:;,.()[\]{}])/;

type State = { commentDepth: number };

function token(stream: StringStream, state: State): string | null {
  if (state.commentDepth > 0) {
    while (!stream.eol()) {
      if (stream.match('/-')) state.commentDepth++;
      else if (stream.match('-/')) {
        state.commentDepth--;
        if (state.commentDepth === 0) return 'comment';
      } else stream.next();
    }
    return 'comment';
  }
  if (stream.eatSpace()) return null;
  if (stream.match('--')) {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.match('/-')) {
    state.commentDepth = 1;
    return token(stream, state) ?? 'comment';
  }
  if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
  if (stream.match(/^\d+/)) return 'number';
  const word = stream.match(/^[\p{L}_][\p{L}\p{N}_'!?.₀-₉]*/u) as RegExpMatchArray | null;
  if (word) {
    const w = word[0];
    if (KEYWORDS.has(w)) return 'keyword';
    if (TACTICS.has(w)) return 'tactic';
    if (SORTS.has(w)) return 'typeName';
    return 'variableName';
  }
  if (stream.match(SYMBOLS)) return 'operator';
  stream.next();
  return null;
}

export const lean4 = StreamLanguage.define<State>({
  name: 'lean4',
  startState: () => ({ commentDepth: 0 }),
  copyState: (s) => ({ ...s }),
  token,
  tokenTable: { tactic: t.special(t.keyword) },
  languageData: { commentTokens: { line: '--', block: { open: '/-', close: '-/' } } },
});

// Colors are theme variables (theme.css), so the editor follows light / dark mode.
export const leanHighlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--syn-keyword)' },
  { tag: t.special(t.keyword), color: 'var(--syn-tactic)', fontWeight: '600' },
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.number, color: 'var(--syn-number)' },
  { tag: t.string, color: 'var(--syn-string)' },
  { tag: t.typeName, color: 'var(--syn-type)' },
  { tag: t.operator, color: 'var(--syn-operator)' },
  { tag: t.variableName, color: 'var(--syn-text)' },
]);
