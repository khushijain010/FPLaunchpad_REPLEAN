// What a public live server refuses to elaborate.
//
// Elaborating Lean can run code: `#eval` runs IO directly, `native_decide` runs compiled code,
// `unsafeBaseIO` & co. smuggle IO into pure code, and `macro`/`syntax`/`elab` can assemble any
// of those without spelling them out. Proofs don't need any of it. This filter is one layer;
// the container sandbox is the other (see docs/LIVE.md). It is deliberately blunt: it scans
// comments and strings too, and says exactly what it didn't like.

/** `#` commands that only inspect, never evaluate. Everything else starting with `#` is refused. */
const SAFE_HASH = new Set(['#check', '#check_failure', '#print', '#reduce', '#synth', '#guard_msgs', '#help']);

const FORBIDDEN: readonly Readonly<[RegExp, string]>[] = [
  [/^\s*import\b/m, '`import`: live mode runs core Lean only'],
  [/\bnative_decide\b/, '`native_decide` runs compiled code'],
  [/\bunsafe\w*/, '`unsafe` code'],
  [/\bimplemented_by\b|\bextern\b/, '`implemented_by` / `extern`'],
  [/\b(?:builtin_)?initialize\b/, '`initialize`'],
  [/\b(?:macro|macro_rules|syntax|elab|elab_rules|declare_syntax_cat)\b/, 'custom syntax (`macro`, `syntax`, `elab`)'],
  [/@\[\s*(?:[\w.]+_elab|tactic|macro|command_elab|term_elab|init)\b/, 'elaborator attributes'],
  [/\brun_(?:cmd|elab|meta|tac)\b/, '`run_cmd` and friends'],
  [/\bIO\.|\bEIO\b|\bBaseIO\b/, '`IO`'],
];

export type PolicyResult = Readonly<{ ok: true } | { ok: false; reasons: readonly string[] }>;

export function checkPublicSource(source: string): PolicyResult {
  const reasons = FORBIDDEN.filter(([re]) => re.test(source)).map(([, why]) => why);
  const hashCommands = [...new Set([...source.matchAll(/#[a-z_!]+/g)].map((m) => m[0]))].filter((c) => !SAFE_HASH.has(c));
  const all = [...reasons, ...hashCommands.map((c) => `\`${c}\` (only ${[...SAFE_HASH].join(', ')} are allowed)`)];
  return all.length === 0 ? { ok: true } : { ok: false, reasons: all };
}
