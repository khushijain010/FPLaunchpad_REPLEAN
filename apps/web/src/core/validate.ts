// Check an untrusted JSON value is a Trace before anything renders it. A bad trace becomes a
// readable error message, never a crash halfway through a 3D scene.

import type { Trace } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function checkGoals(v: unknown, where: string): void {
  if (!isObj(v) || !Array.isArray(v.goals)) throw new Error(`${where} has no goals list.`);
  v.goals.forEach((g: unknown, i) => {
    if (!isObj(g) || !isStr(g.id) || !isStr(g.target) || !Array.isArray(g.hyps)) {
      throw new Error(`${where}, goal ${i + 1}, is missing an id, target or hypotheses.`);
    }
    g.hyps.forEach((h: unknown, j) => {
      if (!isObj(h) || !isStr(h.name) || !isStr(h.type)) {
        throw new Error(`${where}, goal ${i + 1}, hypothesis ${j + 1}, is missing a name or type.`);
      }
    });
  });
}

export function validateTrace(json: unknown): Trace {
  if (!isObj(json)) throw new Error('The trace is not a JSON object.');
  if (json.schema !== 1) throw new Error(`Trace schema ${String(json.schema)} is not one I can read (expected 1).`);
  if (!isObj(json.meta) || !isStr(json.meta.title)) throw new Error('The trace has no title.');
  if (!isStr(json.source)) throw new Error('The trace has no source text.');
  if (!Array.isArray(json.steps)) throw new Error('The trace has no steps.');
  const lines = json.source.split('\n').length;
  json.steps.forEach((s: unknown, i) => {
    const where = `Step ${i + 1}`;
    if (!isObj(s) || !isObj(s.range) || !isNum(s.range.line) || !isStr(s.text)) {
      throw new Error(`${where} is missing its line or text.`);
    }
    if (s.range.line < 1 || s.range.line > lines) throw new Error(`${where} points at line ${s.range.line}, past the end of the file.`);
    checkGoals(s.before, `${where} (before)`);
    checkGoals(s.after, `${where} (after)`);
  });
  return {
    ...(json as unknown as Trace),
    messages: Array.isArray(json.messages) ? (json.messages as Trace['messages']) : [],
  };
}
