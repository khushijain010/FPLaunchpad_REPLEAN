# Live mode

Paste a proof, upload a `.lean` file or drop one on the editor, press **Run** (`Ctrl+Enter`),
and the player shows your proof the same way it shows the samples. Pick
**+ Your own proof (live)** in the sample picker to open the editor.

```
browser ──POST /api/trace {source}──▶ apps/server (Fastify) ──writes lean/Live/L<uuid>.lean
                                          │
                                          └─ lake exe extract ─▶ raw JSON ─▶ buildSteps ─▶ trace
browser ◀───────────── { trace } ─────────┘   (same extractor and core as the samples)
```

## Running it locally

```sh
pnpm live        # Lean backend on 127.0.0.1:8787 + the player on http://localhost:5173
```

Needs Lean via elan. The dev server (and `pnpm preview`) forward `/api` to the backend, so the
page talks to its own origin. Locally the server listens on loopback only.

## Running it on the deployed site

The static site can't run Lean, so live mode on the public site talks to a hosted copy of the
backend: the `Dockerfile` at the repo root. The frontend finds it through `VITE_LIVE_API`, set
at build time. If it's unset, the site is demo-only and the live entry hides itself when no
backend answers.

**Render (free, what `render.yaml` sets up):** New → Blueprint → this repo. Set
`LEMMASCOPE_ORIGINS` to the deployed site's origin (for GitHub Pages: `https://<you>.github.io`).
Then put the service URL (`https://lemmascope-live.onrender.com` or similar) in the repo's Actions
variable `LIVE_API_URL` and re-run the Pages workflow.

Free instances sleep after ~15 idle minutes. The first request then takes up to a minute while the
container wakes, and the UI says so ("Waking the Lean server..."). The page pings the server as
soon as it loads, so it's often awake by the time someone presses Run.

Any Docker host works the same way (Fly.io, Railway, a VPS): run the image, set `PORT` if the host
wants a specific one, and set `LEMMASCOPE_ORIGINS`.

## Security

Elaborating Lean can run arbitrary code: `#eval` does IO, `native_decide` runs compiled code,
`unsafeBaseIO` hides IO in pure code, and macros can assemble any of these without spelling them
out. A public server that runs pasted Lean is a public server that runs pasted code. The layers:

| Layer | What it does |
| --- | --- |
| Source filter (`apps/server/src/policy.ts`, public mode only) | Refuses `#eval` and every `#` command except `#check`, `#print`, `#reduce`, `#synth`, `#check_failure`, `#guard_msgs`; refuses `import`, `native_decide`, `unsafe*`, `implemented_by`, `extern`, `initialize`, `macro`/`syntax`/`elab` and elaborator attributes, `run_cmd` and friends, and `IO`. Scans comments too. Proofs don't need any of it. |
| Container | Non-root user, no secrets in the image or environment, nothing else running in it. |
| Limits | 64 KB source, 60 s per run with the whole process tree killed, one run at a time, 6 runs per minute per IP. |
| Origin check | Only the player's own pages may call the API (CORS allow-list); everything else gets 403. |

**What's still possible:** a text filter is not a proof of safety. Someone determined might find a
way past it. If they do, they get a disposable container for up to 60 seconds: they could burn
CPU or make outbound network requests (free hosts don't let us block egress). There's nothing
secret in the container to steal, and it redeploys clean. That's an acceptable risk for a
hackathon demo; it would not be for a product, which would add a real sandbox (gVisor or
Firecracker per run, no network).

Locally (`pnpm live`) none of the filtering applies: it's your machine and your code, same as
running `lean` yourself. The local server only binds to 127.0.0.1 and only answers the player's
pages, so other websites can't use it.
