// The JSON printed by `lake exe extract`. One record per tactic node in Lean's InfoTree.
// Lines are 1-based, columns are 0-based codepoint offsets (Lean's `Position`).

export type RawPos = Readonly<{ line: number; col: number }>;

export type RawHyp = Readonly<{ name: string; type: string; id: string }>;

export type RawGoal = Readonly<{
  id: string;
  tag: string;
  hyps: readonly RawHyp[];
  target: string;
}>;

export type RawNode = Readonly<{
  id: number;
  /** Index of the top-level command the node came from. */
  cmd: number;
  /** Nearest enclosing tactic node. Lean's derived ToJson writes `null` or omits it. */
  parent?: number | null;
  kind: string;
  start: RawPos;
  stop: RawPos;
  before: readonly RawGoal[];
  after: readonly RawGoal[];
}>;

export type RawMessage = Readonly<{
  severity: 'error' | 'warning' | 'info';
  start: RawPos;
  stop?: RawPos | null;
  text: string;
}>;

export type RawOutput = Readonly<{
  leanVersion: string;
  file: string;
  nodes: readonly RawNode[];
  messages: readonly RawMessage[];
}>;

/** Narrow an unknown JSON value to RawOutput, or explain what is wrong with it. */
export function parseRawOutput(json: unknown): RawOutput {
  if (typeof json !== 'object' || json === null) throw new Error('extractor output is not an object');
  const o = json as Record<string, unknown>;
  if (typeof o.leanVersion !== 'string') throw new Error('extractor output has no leanVersion');
  if (!Array.isArray(o.nodes)) throw new Error('extractor output has no nodes array');
  if (!Array.isArray(o.messages)) throw new Error('extractor output has no messages array');
  return json as RawOutput;
}
