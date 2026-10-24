// The trace format. Everything the player shows is derived from one of these,
// and every proof state in it was printed by Lean (see lean/Extractor.lean).

export type Hyp = Readonly<{
  name: string;
  type: string;
  /** Lean's FVarId. Stable across steps until a tactic replaces the hypothesis. */
  id: string;
}>;

export type Goal = Readonly<{
  /** Lean's MVarId. A tactic that changes a goal produces a goal with a new id. */
  id: string;
  /** The case tag Lean gives the goal (`zero`, `succ`, `left`...), or "". */
  tag: string;
  hyps: readonly Hyp[];
  target: string;
}>;

export type ProofState = Readonly<{ goals: readonly Goal[] }>;

export type Range = Readonly<{
  /** 1-based line number. */
  line: number;
  /** 0-based column where the first tactic on the line starts. */
  colStart: number;
  /** 0-based column just past the end of the line's text. */
  colEnd: number;
}>;

export type Step = Readonly<{
  index: number;
  /** Which proof (`by` block, counted per top-level command) this line belongs to. */
  proof: number;
  range: Range;
  /** The line as written, trimmed. */
  text: string;
  /** Head tactic name: "intro", "rw", ... */
  tactic: string;
  before: ProofState;
  after: ProofState;
  error?: Readonly<{ message: string }>;
}>;

export type TraceMessage = Readonly<{
  severity: 'error' | 'warning' | 'info';
  line: number;
  col: number;
  text: string;
}>;

export type TraceMeta = Readonly<{
  id: string;
  title: string;
  blurb: string;
  /** "What to watch" hint shown above the editor. */
  watch: string;
  /** Statement of the headline theorem. */
  theorem: string;
  leanVersion: string;
}>;

export type Trace = Readonly<{
  schema: 1;
  meta: TraceMeta;
  /** Full file text, LF line endings. */
  source: string;
  steps: readonly Step[];
  /** Everything Lean reported for the file, including messages outside proofs. */
  messages: readonly TraceMessage[];
}>;

export type SampleInfo = Readonly<{
  id: string;
  title: string;
  blurb: string;
  file: string;
}>;

export type ViewId = 'tree' | 'list' | 'rewrite' | 'shrink';
