# Human tasks

Things only you can do. Ordered by priority. Tick them off as you go.

- [x] **1. Install Lean 4 via elan.** Done (elan 4.2.4, Lean 4.34.1).

- [x] **2. Push to GitHub.** Done: github.com/khushijain010/FPLaunchpad_REPLEAN
  - Why: CI, both deployments and the submission all need the repo on GitHub. I can't log in for you.
  - How: create an empty repo on github.com (no README or license, so the push is clean), then from the repo root:
    ```powershell
    git remote add origin https://github.com/<you>/replean.git
    git push -u origin main
    ```
  - Then open the **Actions** tab. `CI` has four jobs: web, Lean (golden check), and
    `live-server-image`, which builds the Docker image and tests it against real Lean. That one is
    the first real build of the image, so tell me if it fails and paste the log.

- [x] **3. Deploy the site on GitHub Pages.** Done: https://khushijain010.github.io/FPLaunchpad_REPLEAN/
  - Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
  - The `Deploy to GitHub Pages` workflow runs on every push to `main`. Your site will be
    `https://<you>.github.io/<repo>/`.

- [x] **4. Deploy the live Lean server on Render.** Done: https://replean-live.onrender.com (health ok, public mode, CORS allows the Pages site; the full UI check passes against the deployed site)
  1. Sign up at https://render.com with your GitHub account (free plan, no card).
  2. **New → Blueprint**, pick your repo. Render reads `render.yaml` and creates `replean-live`.
  3. When asked for `REPLEAN_ORIGINS`, enter your site's origin, scheme and host only:
     `https://<you>.github.io` (no `/repo` path, no trailing slash).
  4. Wait for the first deploy (it downloads Lean, ~5–10 min). Copy the service URL,
     e.g. `https://replean-live.onrender.com`. Check `<that URL>/api/health` shows `"ok":true`.
  5. In GitHub: repo **Settings → Secrets and variables → Actions → Variables → New repository variable**,
     name `LIVE_API_URL`, value = that service URL.
  6. **Actions → Deploy to GitHub Pages → Run workflow**, so the site is rebuilt knowing where the server is.
  - Free instances sleep when idle; the first run after a quiet spell takes up to a minute. Before a
    demo, open the site a minute early.

- [ ] **5. Finish identity and README** (priority: before submission)
  - `apps/web/src/identity.ts`: set `repoUrl` (replace the whole `'{{REPO_URL}}'`).
    `oneLineStory` is `'I was BORN'` and shows in the About dialog; change it if that wasn't meant to stay.
  - `README.md`: the two `TODO(me)` lines, your story (2–3 sentences, your words) and the deployed link.

- [ ] **6. Test on your laptop and phone** (priority: before submission)
  - All five samples; `L` (lite) and `F` (presentation); then **+ Your own proof (live)**: paste a proof, Run.

- [ ] **7. Record the backup demo video** (priority: before submission)
  - Follow `docs/DEMO.md` (90 s), and add 10 s of live mode at the end. Windows: `Win + Alt + R`.
  - Fresh screenshots: `pnpm build`, then `pnpm live` (or `pnpm preview`) in one terminal and `pnpm capture` in another.

- [ ] **8. Tag v1.0** (priority: before submission, after CI is green)
  ```powershell
  git tag -a v1.0 -m "Replean v1.0"
  git push origin v1.0
  ```

- [ ] **9. Submit on the hackathon portal** (priority: before submission)
  - Repo link, deployed link, the README pitch line, the video.
