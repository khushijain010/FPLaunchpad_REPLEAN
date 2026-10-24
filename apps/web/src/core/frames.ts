// reduce(trace, k) -> Frame. Frame k is the world after k steps have run (0 = nothing yet).
// Every view, the goal panel, the Why panel and the editor decorations render from a Frame.

import { chooseView } from './chooseView';
import { diffStates, type StepDiff } from './diff';
import { explainTactic, stepSummary, type Explanation } from './explain';
import { buildGoalGraph, nodeStatuses, type GoalGraph, type NodeStatus } from './graph';
import { layoutTree, type Layout } from './layout';
import type { ProofState, Step, Trace, ViewId } from './types';

export type Frame = Readonly<{
  index: number;
  total: number;
  /** Goals open right now. */
  state: ProofState;
  /** At a boundary between two proofs: the next proof's starting goals. */
  upcoming: ProofState | undefined;
  /** The step that just ran (index - 1), if any. */
  step: Step | undefined;
  /** The step Next will run. */
  nextStep: Step | undefined;
  diff: StepDiff | undefined;
  explanation: Explanation | undefined;
  activeGoalId: string | undefined;
  remaining: number;
  /** Every step has run, nothing is left and nothing failed. */
  done: boolean;
  /** Line numbers of steps already run, and the line that just ran. */
  executedLines: readonly number[];
  currentLine: number | undefined;
  errorLines: readonly number[];
  statuses: ReadonlyMap<string, NodeStatus>;
  view: ViewId;
  summary: string;
}>;

export type Film = Readonly<{
  trace: Trace;
  graph: GoalGraph;
  layout: Layout;
  frames: readonly Frame[];
}>;

const NO_GOALS: ProofState = { goals: [] };

function frameAt(trace: Trace, graph: GoalGraph, k: number): Frame {
  const steps = trace.steps;
  const total = steps.length;
  const step: Step | undefined = steps[k - 1];
  const nextStep: Step | undefined = steps[k];
  const state = step ? step.after : (nextStep?.before ?? NO_GOALS);
  const upcoming =
    step && nextStep && nextStep.proof !== step.proof ? nextStep.before : undefined;
  const diff = step ? diffStates(step.before, step.after, step.text) : undefined;
  const ran = steps.slice(0, k);
  const done = k === total && total > 0 && state.goals.length === 0 && !ran.some((s) => s.error);
  const activeGoalId = (state.goals[0] ?? upcoming?.goals[0])?.id;
  return {
    index: k,
    total,
    state,
    upcoming,
    step,
    nextStep,
    diff,
    explanation: step && diff ? explainTactic(step, diff) : undefined,
    activeGoalId,
    remaining: state.goals.length,
    done,
    executedLines: ran.map((s) => s.range.line),
    currentLine: step?.range.line,
    errorLines: ran.filter((s) => s.error).map((s) => s.range.line),
    statuses: nodeStatuses(graph, steps, k, activeGoalId),
    view: chooseView({ step, diff, done }),
    summary: done ? 'Q.E.D. Nothing left to prove.' : stepSummary(k, total, step, state.goals.length),
  };
}

/** Every frame of a trace, computed up front. Scrubbing is then just an array index. */
export function buildFrames(trace: Trace): Film {
  const graph = buildGoalGraph(trace.steps);
  const frames = Array.from({ length: trace.steps.length + 1 }, (_, k) => frameAt(trace, graph, k));
  return { trace, graph, layout: layoutTree(graph), frames };
}

const films = new WeakMap<Trace, Film>();

/** Memoised per trace object; observably pure. */
export function filmOf(trace: Trace): Film {
  const cached = films.get(trace);
  if (cached) return cached;
  const film = buildFrames(trace);
  films.set(trace, film);
  return film;
}

export const clampStep = (trace: Trace, k: number): number => Math.max(0, Math.min(trace.steps.length, Math.round(k)));

export function reduce(trace: Trace, k: number): Frame {
  return filmOf(trace).frames[clampStep(trace, k)]!;
}
