# Human tasks

Things only you can do. Ordered roughly by priority. Tick them off as you go.

- [x] **1. Install Lean 4 via elan** (priority: now)
  - Why: every proof state shown must come from a real Lean run. The installer was blocked for me.
  - How (PowerShell):
    ```powershell
    curl -O --location https://raw.githubusercontent.com/leanprover/elan/master/elan-init.ps1
    powershell -ExecutionPolicy Bypass -f elan-init.ps1
    ```
    Accept the defaults, open a new terminal, then check `elan --version` and `lean --version`.
    Then tell me, and I'll run `cd lean && lake build` and `pnpm traces`.
  - Blocking: compiling samples, checking the extractor, generating the 5 traces.
- [ ] **2. Finish your identity** (priority: before submission)
  - Done: name (Khushi), team (Bilibuu), college (IITR).
  - Still open in `apps/web/src/identity.ts`: `oneLineStory` (one sentence, your words: why you built this)
    and `repoUrl` (after task 3). Replace the whole `'{{...}}'` string, braces included.
  - Blocking: nothing; unfilled fields are hidden in the UI.
