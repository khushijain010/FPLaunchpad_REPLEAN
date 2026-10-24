# Human tasks

Things only you can do. Ordered by priority. Tick them off as you go.

- [x] **1. Install Lean 4 via elan.** Done (elan 4.2.4, Lean 4.34.1).

- [ ] **2. Push to GitHub** (priority: now)
  - Why: CI, GitHub Pages and the submission all need a public repo. I can't log in for you.
  - How: create an empty repo on github.com (no README/license, so the push is clean), then from the repo root:
    ```powershell
    git remote add origin https://github.com/<you>/lemmascope.git
    git push -u origin main
    ```
  - Then check the **Actions** tab: `CI` should go green (web job + Lean job with the golden check).

- [ ] **3. Deploy the demo** (priority: before submission). Pick one:
  - **GitHub Pages** (no new account): repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
    The `Deploy to GitHub Pages` workflow runs on every push to `main`; the link appears in the Actions run.
  - **Vercel**: `npm i -g vercel`, then `vercel login`, then `vercel --prod` from the repo root (`vercel.json` is ready).
  - **Netlify**: `npm i -g netlify-cli`, then `netlify login`, then `netlify deploy --build --prod` (`netlify.toml` is ready).

- [ ] **4. Finish identity and README** (priority: before submission)
  - `apps/web/src/identity.ts`: set `repoUrl` to the GitHub URL (replace the whole `'{{REPO_URL}}'`).
    `oneLineStory` is currently `'I was BORN'`. It shows in the About dialog, so make sure that's what you want there.
  - `README.md`: the two `TODO(me)` lines, your story (2–3 sentences, your words) and the deployed link.

- [ ] **5. Test the deployed link on your laptop and your phone** (priority: before submission)
  - Step through all five samples; try `L` (lite) and `F` (presentation). On the phone the columns stack.

- [ ] **6. Record the backup demo video** (priority: before submission)
  - Follow `docs/DEMO.md` (90 s). Windows: `Win + Alt + R` (Xbox Game Bar) records the browser window.
  - Optional: a 15-second GIF for the top of the README in place of the screenshot.
  - Fresh screenshots any time: `pnpm build`, then `pnpm preview` in one terminal and `pnpm capture` in another.

- [ ] **7. Tag v1.0** (priority: before submission, after CI is green)
  ```powershell
  git tag -a v1.0 -m "Lemmascope v1.0"
  git push origin v1.0
  ```

- [ ] **8. Submit on the hackathon portal** (priority: before submission)
  - Repo link, deployed link, the README pitch line, the video.

- [ ] Optional: tell me if you want live mode (paste your own Lean, local backend). It's cut for now so the replay player stays solid.
