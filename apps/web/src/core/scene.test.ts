import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { andCommRaw, andCommSource, goals } from './fixtures.test-data';
import { buildFrames } from './frames';
import { buildScene } from './scene';

const steps = buildSteps(andCommRaw, andCommSource).steps;
const film = buildFrames({
  schema: 1,
  meta: { id: 'x', title: 'x', blurb: '', watch: '', theorem: '', leanVersion: 'test' },
  source: andCommSource,
  steps,
  messages: [],
});
const scene = (k: number) => buildScene(film, film.frames[k]!);

describe('buildScene', () => {
  it('starts with just the theorem', () => {
    expect(scene(0).nodes.map((n) => n.id)).toEqual([goals.g0.id]);
    expect(scene(0).edges).toEqual([]);
  });
  it('grows: the split adds two nodes and two labelled edges, marked new', () => {
    const s = scene(2);
    expect(s.nodes).toHaveLength(4);
    const fresh = s.edges.filter((e) => e.isNew);
    expect(fresh.map((e) => e.label)).toEqual(['constructor', '']);
    expect(s.active?.id).toBe(goals.g2.id);
  });
  it('fills the proved constellation in closing order', () => {
    expect(scene(3).proved.map((p) => p.id)).toEqual([goals.g2.id]);
    expect(scene(4).proved.map((p) => [p.id, p.slot])).toEqual([
      [goals.g2.id, 0],
      [goals.g3.id, 1],
    ]);
    expect(scene(4).done).toBe(true);
  });
  it('knows which hypotheses arrived and which were used', () => {
    expect([...scene(1).addedHyps]).toEqual(['h']);
    expect([...scene(3).usedHyps]).toEqual(['h']);
  });
});
