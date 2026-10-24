# Human tasks

Things only you can do. Ordered roughly by priority. Tick them off as you go.

- [ ] **1. Install Lean 4 via elan** (priority: now)
  - Why: every proof state shown must come from a real Lean run. The installer was blocked for me.
  - How (PowerShell):
    ```powershell
    curl -O --location https://raw.githubusercontent.com/leanprover/elan/master/elan-init.ps1
    powershell -ExecutionPolicy Bypass -f elan-init.ps1
    ```
    Accept the defaults, open a new terminal, then check `elan --version` and `lean --version`.
    Then tell me, and I'll run `cd lean && lake build` and `pnpm traces`.
  - Blocking: compiling samples, checking the extractor, generating the 5 traces.

- [ ] **2. Fill in your identity** (priority: before submission)
  - Why: name, team, college and story appear in the footer, About dialog and README. I won't make them up.
  - How: edit `apps/web/src/identity.ts` and replace each `{{...}}` placeholder.
  - Blocking: nothing, placeholders render until then.
