import { describe, expect, it } from 'vitest';
import { buildSteps } from './buildSteps';
import { andCommRaw, andCommSource } from './fixtures.test-data';
import { validateTrace } from './validate';

const good = {
  schema: 1,
  meta: { id: 'x', title: 'X', blurb: '', watch: '', theorem: '', leanVersion: 'test' },
  source: andCommSource,
  steps: buildSteps(andCommRaw, andCommSource).steps,
  messages: [],
};

describe('validateTrace', () => {
  it('accepts a well-formed trace', () => {
    expect(validateTrace(good).steps).toHaveLength(4);
  });
  it('fills in missing messages', () => {
    const { messages: _, ...rest } = good;
    expect(validateTrace(rest).messages).toEqual([]);
  });
  it.each([
    [null, 'not a JSON object'],
    [{ ...good, schema: 2 }, 'schema 2'],
    [{ ...good, steps: 'no' }, 'no steps'],
    [{ ...good, steps: [{ ...good.steps[0], range: { line: 99 } }] }, 'past the end'],
    [{ ...good, steps: [{ ...good.steps[0], after: { goals: [{ id: 'g' }] } }] }, 'Step 1 (after), goal 1'],
  ])('explains what is wrong (%#)', (input, message) => {
    expect(() => validateTrace(input)).toThrow(message);
  });
});
