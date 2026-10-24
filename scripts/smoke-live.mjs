// Smoke test for a public live-mode server (the Docker image, or the deployed Render service).
//
//   node scripts/smoke-live.mjs http://localhost:8787
//   node scripts/smoke-live.mjs https://replean-live.onrender.com
//
// Checks: health, a real proof comes back as a 3-step trace, code execution is refused,
// other websites are refused. Plain Node (18+), no dependencies, so CI can run it anywhere.

const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/+$/, '');
const failures = [];

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`);
  if (!ok) failures.push(name);
};

const post = (body, headers = {}) =>
  fetch(`${base}/api/trace`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// A sleeping free-tier host can take a minute to answer the first request.
let health = null;
for (let i = 0; i < 60 && !health?.ok; i++) {
  try {
    health = await (await fetch(`${base}/api/health`)).json();
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
}
check('health answers ok', health?.ok === true, JSON.stringify(health));

const proof = ['theorem t (p q : Prop) (hp : p) (hq : q) : p ∧ q := by', '  constructor', '  · exact hp', '  · exact hq', ''].join('\n');
const res = await post({ source: proof });
const body = await res.json().catch(() => ({}));
check('a real proof comes back as a 3-step trace', res.status === 200 && body.trace?.steps?.length === 3, `${res.status} ${JSON.stringify(body).slice(0, 160)}`);

if (health?.public) {
  const evalRes = await post({ source: '#eval 1 + 1' });
  check('#eval is refused (public mode)', evalRes.status === 422, String(evalRes.status));
}

const evil = await post({ source: 'theorem x : True := trivial' }, { origin: 'https://evil.example' });
check('other websites are refused', evil.status === 403, String(evil.status));

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll live-server checks passed.');
process.exit(failures.length ? 1 : 0);
