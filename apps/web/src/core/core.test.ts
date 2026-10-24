import { describe, expect, it } from 'vitest';
import { buildSteps, fullGoals } from './buildSteps';
import { chooseView } from './chooseView';
import { diffHyps, diffStates } from './diff';
import { explainTactic, stepSummary } from './explain';
import { andCommRaw, andCommSource, goals } from './fixtures.test-data';
import { buildFrames, reduce } from './frames';
import { buildGoalGraph } from './graph';
import { layoutTree, shortLabel } from './layout';
import { chainLinks, hasConcreteList, listCells, parseListLiteral, parseListLiterals, sides } from './lists';
import { extractTheorem, headTactic, mentionedNames, theoremAt } from './tactics';
import { rewriteSummary, tokenDiff, tokenize } from './tokens';
import type { Step, Trace } from './types';

const { g0, g1, g2, g3 } = goals;
const built = buildSteps(andCommRaw, andCommSource);
const trace: Trace = {
  schema: 1,
  meta: { id: 'and_comm', title: 't', blurb: 'b', watch: 'w', theorem: 'x', leanVersion: 'test' },
  source: andCommSource,
  steps: built.steps,
  messages: built.messages,
};
const ids = (gs: readonly { id: string }[]) => gs.map((g) => g.id);

describe('buildSteps', () => {
  it('makes exactly one step per proof line', () => {
    expect(built.steps.map((s) => s.range.line)).toEqual([4, 5, 6, 7]);
    expect(built.steps.map((s) => s.text)).toEqual(['intro h', 'constructor', '· exact h.2', '· exact h.1']);
  });

  it('chains states: after of one line is before of the next', () => {
    const s = built.steps;
    expect(ids(s[0]!.before.goals)).toEqual([g0.id]);
    expect(ids(s[0]!.after.goals)).toEqual([g1.id]);
    expect(ids(s[1]!.after.goals)).toEqual([g2.id, g3.id]);
    expect(ids(s[2]!.before.goals)).toEqual([g2.id, g3.id]);
    expect(ids(s[2]!.after.goals)).toEqual([g3.id]);
    expect(ids(s[3]!.after.goals)).toEqual([]);
  });

  it('reads the head tactic through a bullet', () => {
    expect(built.steps.map((s) => s.tactic)).toEqual(['intro', 'constructor', 'exact', 'exact']);
  });

  it('attaches an error to the line it is on', () => {
    const withError = {
      ...andCommRaw,
      messages: [{ severity: 'error' as const, start: { line: 6, col: 4 }, text: 'type mismatch' }],
    };
    const s = buildSteps(withError, andCommSource).steps;
    expect(s[2]!.error?.message).toBe('type mismatch');
    expect(s.filter((x) => x.error)).toHaveLength(1);
  });

  it('drops duplicate messages', () => {
    const m = { severity: 'error' as const, start: { line: 6, col: 4 }, text: 'No goals to be solved' };
    expect(buildSteps({ ...andCommRaw, messages: [m, m] }, andCommSource).messages).toHaveLength(1);
  });

  it('gives each top-level command its own proof number', () => {
    const second = andCommRaw.nodes.map((n) => ({ ...n, id: n.id + 100, cmd: 5, parent: n.parent == null ? null : n.parent + 100, start: { ...n.start, line: n.start.line + 10 }, stop: { ...n.stop, line: n.stop.line + 10 } }));
    const s = buildSteps({ ...andCommRaw, nodes: [...andCommRaw.nodes, ...second] }, andCommSource).steps;
    expect(s.map((x) => x.proof)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(ids(s[3]!.after.goals)).toEqual([]);
  });
});

describe('fullGoals', () => {
  it('adds back goals parked by an enclosing bullet', () => {
    const node = (id: number) => andCommRaw.nodes.find((n) => n.id === id)!;
    const ancestors = [node(4), node(1), node(0), node(101), node(100)];
    expect(ids(fullGoals(node(5).before, ancestors))).toEqual([g2.id, g3.id]);
  });
  it('never duplicates a visible goal', () => {
    const bullet = andCommRaw.nodes.find((n) => n.id === 4)!;
    expect(ids(fullGoals([g2, g3], [bullet]))).toEqual([g2.id, g3.id]);
  });
});

describe('diffStates', () => {
  it('sees intro as one goal replaced, with a new hypothesis', () => {
    const d = diffStates({ goals: [g0] }, { goals: [g1] }, 'intro h');
    expect(d.acted?.id).toBe(g0.id);
    expect(ids(d.opened)).toEqual([g1.id]);
    expect(d.proved).toEqual([]);
    expect(d.added.map((h) => h.name)).toEqual(['h']);
    expect(d.goals[0]!.targetChanged).toBe(true);
  });
  it('sees constructor as a split', () => {
    const d = diffStates({ goals: [g1] }, { goals: [g2, g3] }, 'constructor');
    expect(ids(d.opened)).toEqual([g2.id, g3.id]);
    expect(d.goals.every((g) => g.from?.id === g1.id)).toBe(true);
  });
  it('sees exact as a proof, and knows which hypothesis it used', () => {
    const d = diffStates({ goals: [g2, g3] }, { goals: [g3] }, '· exact h.2');
    expect(d.acted?.id).toBe(g2.id);
    expect(d.opened).toEqual([]);
    expect(ids(d.proved)).toEqual([g2.id]);
    expect(ids(d.kept)).toEqual([g3.id]);
    expect(d.usedHyps.map((h) => h.name)).toEqual(['h']);
  });
  it('marks a hypothesis whose type changed', () => {
    const changes = diffHyps([{ name: 'h', type: 'a', id: '1' }], [{ name: 'h', type: 'b', id: '2' }]);
    expect(changes).toEqual([{ kind: 'changed', hyp: { name: 'h', type: 'b', id: '2' }, was: { name: 'h', type: 'a', id: '1' } }]);
  });
  it('tells apart two hypotheses with the same inaccessible name', () => {
    const hs = [
      { name: 'a_ih✝', type: 'P a', id: '1' },
      { name: 'a_ih✝', type: 'P b', id: '2' },
    ];
    expect(diffHyps(hs, hs).map((c) => c.kind)).toEqual(['same', 'same']);
  });
  it('pairs a rewritten hypothesis with its old self by name', () => {
    const changes = diffHyps([{ name: 'h', type: 'a ++ []', id: '1' }], [{ name: 'h', type: 'a', id: '9' }]);
    expect(changes.map((c) => c.kind)).toEqual(['changed']);
  });
  it('lists removed hypotheses after the kept ones', () => {
    const changes = diffHyps([{ name: 'a', type: 'A', id: '1' }, { name: 'b', type: 'B', id: '2' }], [{ name: 'b', type: 'B', id: '2' }]);
    expect(changes.map((c) => c.kind)).toEqual(['same', 'removed']);
  });
});

describe('goal graph', () => {
  const graph = buildGoalGraph(built.steps);
  it('links every goal to the goal it came from', () => {
    expect(graph.roots).toEqual([g0.id]);
    expect(graph.nodes.get(g1.id)?.parent).toBe(g0.id);
    expect(graph.nodes.get(g0.id)?.children).toEqual([g1.id]);
    expect(graph.nodes.get(g1.id)?.children).toEqual([g2.id, g3.id]);
  });
  it('records when each goal is born and ends', () => {
    const n = (id: string) => graph.nodes.get(id)!;
    expect([n(g0.id).bornFrame, n(g0.id).endFrame]).toEqual([0, 1]);
    expect([n(g2.id).bornFrame, n(g2.id).endFrame]).toEqual([2, 3]);
    expect([n(g3.id).bornFrame, n(g3.id).endFrame]).toEqual([2, 4]);
  });
});

describe('frames', () => {
  const film = buildFrames(trace);
  it('has one frame per step plus the start', () => {
    expect(film.frames).toHaveLength(5);
  });
  it('grows the graph, then turns it gold', () => {
    const st = (k: number, id: string) => film.frames[k]!.statuses.get(id);
    expect(st(0, g0.id)).toBe('active');
    expect(st(0, g1.id)).toBe('hidden');
    expect(st(2, g2.id)).toBe('active');
    expect(st(2, g3.id)).toBe('open');
    expect(st(3, g2.id)).toBe('proved');
    expect(st(3, g1.id)).toBe('worked');
    expect(st(4, g1.id)).toBe('proved');
    expect(st(4, g0.id)).toBe('proved');
  });
  it('declares Q.E.D. only at the end', () => {
    expect(film.frames.map((f) => f.done)).toEqual([false, false, false, false, true]);
    expect(film.frames[4]!.summary).toBe('Q.E.D. All goals closed.');
  });
  it('is a pure function of the index: jumping matches stepping', () => {
    expect(reduce(trace, 3)).toStrictEqual(film.frames[3]);
    expect(reduce(trace, 99)).toBe(reduce(trace, 4));
    expect(reduce(trace, -5).index).toBe(0);
    expect(buildFrames(trace).frames[2]!.summary).toBe(film.frames[2]!.summary);
  });
  it('marks the error goal red instead of gold', () => {
    const steps: Step[] = trace.steps.map((s, i) => (i === 2 ? { ...s, error: { message: 'nope' } } : s));
    const f = buildFrames({ ...trace, steps }).frames;
    expect(f[3]!.statuses.get(g2.id)).toBe('error');
    expect(f[4]!.done).toBe(false);
    expect(f[4]!.errorLines).toEqual([6]);
  });
});

describe('chooseView', () => {
  const frameView = (k: number) => buildFrames(trace).frames[k]!.view;
  it('uses the tree for structure and Q.E.D., shrink for a closing step', () => {
    expect(frameView(0)).toBe('tree');
    expect(frameView(1)).toBe('tree');
    expect(frameView(2)).toBe('tree');
    expect(frameView(3)).toBe('shrink');
    expect(frameView(4)).toBe('tree');
  });
  it('uses the list lab for a rewrite on a concrete list, the rewrite lens otherwise', () => {
    const goal = (id: string, target: string) => ({ id, tag: '', hyps: [], target });
    const step = (text: string): Step => ({ ...trace.steps[0]!, text, tactic: headTactic(text) });
    const listDiff = diffStates({ goals: [goal('a', 'rev [1, 2] = [2, 1]')] }, { goals: [goal('b', 'app (rev [2]) [1] = [2, 1]')] });
    expect(chooseView({ step: step('rw [rev]'), diff: listDiff, done: false })).toBe('list');
    const natDiff = diffStates({ goals: [goal('a', 'myAdd 0 (k + 1) = k + 1')] }, { goals: [goal('b', 'myAdd 0 k + 1 = k + 1')] });
    expect(chooseView({ step: step('rw [myAdd]'), diff: natDiff, done: false })).toBe('rewrite');
  });
});

describe('layoutTree', () => {
  const layout = layoutTree(buildGoalGraph(built.steps));
  it('puts children one level below their parent and siblings side by side', () => {
    const at = (id: string) => layout.positions.get(id)!;
    expect(at(g1.id).y).toBeLessThan(at(g0.id).y);
    expect(at(g2.id).y).toBe(at(g3.id).y);
    expect(at(g2.id).x).toBeLessThan(at(g3.id).x);
  });
  it('is deterministic', () => {
    expect([...layoutTree(buildGoalGraph(built.steps)).positions]).toEqual([...layout.positions]);
  });
  it('shortens long labels', () => {
    expect(shortLabel('a'.repeat(40), 10)).toBe(`${'a'.repeat(9)}…`);
    expect(shortLabel('p ∧\n  q')).toBe('p ∧ q');
  });
});

describe('lists', () => {
  it('parses list literals, including nested and empty ones', () => {
    expect(parseListLiteral('rev [1, 2, 3] = [3, 2, 1]')?.items).toEqual(['1', '2', '3']);
    expect(parseListLiterals('f [[1, 2], [3]] []').map((l) => l.items)).toEqual([['[1, 2]', '[3]'], []]);
    expect(hasConcreteList('xs ++ []')).toBe(false);
    expect(hasConcreteList('app (rev [2, 3]) [1]')).toBe(true);
  });
  it('turns an expression into item and glue cells, keyed by value', () => {
    const cells = listCells('app (rev [2, 3]) [1]');
    expect(cells.filter((c) => c.kind === 'item').map((c) => c.key)).toEqual(['2#0', '3#0', '1#0']);
    expect(cells[0]).toEqual({ kind: 'glue', text: 'app (rev', key: 'glue:0' });
  });
  it('reads cons cells', () => {
    const items = listCells('3 :: app [] [2]').filter((c) => c.kind === 'item').map((c) => c.text);
    expect(items).toEqual(['3', '2']);
  });
  it('breaks a symbolic append chain into links', () => {
    expect(chainLinks('exec (compile a ++ (compile b ++ rest)) stk')).toEqual(['exec (compile a ++ (compile b ++ rest)) stk']);
    expect(chainLinks('compile a ++ (compile b ++ ([Instr.add] ++ rest))')).toEqual(['compile a', 'compile b', '[Instr.add]', 'rest']);
    expect(chainLinks('eval e :: stk')).toEqual(['eval e', 'stk']);
  });
  it('splits an equation into sides', () => {
    expect(sides('rev [1, 2] = [2, 1]')).toEqual(['rev [1, 2]', '[2, 1]']);
    expect(sides('p ∧ q')).toEqual(['p ∧ q']);
  });
});

describe('tokens', () => {
  it('tokenizes identifiers with dots and primes', () => {
    expect(tokenize("h.2 ∧ x'")).toEqual(['h.2', ' ', '∧', ' ', "x'"]);
  });
  it('diffs a rewrite', () => {
    const ops = tokenDiff('myAdd 0 (k + 1) = k + 1', 'myAdd 0 k + 1 = k + 1');
    expect(ops.filter((o) => o.kind !== 'same').length).toBeGreaterThan(0);
    expect(ops.filter((o) => o.kind !== 'add').map((o) => o.text).join('')).toBe('myAdd 0 (k + 1) = k + 1');
    expect(ops.filter((o) => o.kind !== 'del').map((o) => o.text).join('')).toBe('myAdd 0 k + 1 = k + 1');
  });
  it('summarises what was replaced', () => {
    expect(rewriteSummary(tokenDiff('rev [3]', 'app (rev []) [3]')).to).toContain('app');
  });
});

describe('explain', () => {
  it('describes intro in terms of what moved', () => {
    const e = explainTactic(built.steps[0]!, diffStates(built.steps[0]!.before, built.steps[0]!.after, 'intro h'));
    expect(e.headline).toBe('`intro h` moved `p ∧ q` as `h` out of the goal and into the context.');
  });
  it('says what exact proved and what it used', () => {
    const s = built.steps[2]!;
    const e = explainTactic(s, diffStates(s.before, s.after, s.text));
    expect(e.headline).toBe('`exact h.2` proved `q`.');
    expect(e.facts).toContain('Used `h` : `p ∧ q`.');
    expect(e.facts[0]).toMatch(/bullet/);
  });
  it('reports errors with the line number', () => {
    const s = { ...built.steps[1]!, error: { message: 'unknown tactic\nmore' } };
    expect(explainTactic(s, diffStates(s.before, s.after)).headline).toBe('Lean error on line 5.');
  });
  it('writes a screen-reader summary', () => {
    expect(stepSummary(1, 4, built.steps[0], 1)).toBe('Step 1 of 4: intro h. One goal remains.');
    expect(stepSummary(0, 4, undefined, 1)).toBe('Start. One goal remains.');
  });
});

describe('tactics', () => {
  it('finds the head tactic', () => {
    expect(headTactic('· exact h.2')).toBe('exact');
    expect(headTactic('case succ k ih =>')).toBe('case');
    expect(headTactic('case zero => rfl')).toBe('rfl');
    expect(headTactic('rcases h with hp | hq')).toBe('rcases');
    expect(headTactic('| inl hp => exact hp')).toBe('exact');
    expect(headTactic('simp only [app]')).toBe('simp');
  });
  it('collects mentioned names', () => {
    expect([...mentionedNames('rw [ih, myAdd] -- not h')]).toEqual(['rw', 'ih', 'myAdd']);
  });
  it('finds the theorem a line belongs to', () => {
    const src = 'theorem a : P := by\n  rfl\ntheorem b : Q := by\n  rfl\n';
    expect(theoremAt(src, 2)).toBe('a : P');
    expect(theoremAt(src, 4)).toBe('b : Q');
  });
  it('extracts the last theorem statement', () => {
    expect(extractTheorem(andCommSource)).toBe('and_comm (p q : Prop) : p ∧ q → q ∧ p');
  });
});
