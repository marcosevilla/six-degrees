# Six Degrees — Open Loops

**Tracker (tick boxes here):** https://claude.ai/artifact/RDcTCkgjzBstWVz12XAYcH — db doc `steps/s1`…`s5`, field `checks.<id>`; title pick in `decisions/main`
Full analysis + build prompts: `~/Obsidian/marcowits/resources/research/2026-09-25-six-degrees-relaunch-analysis.md`

## 2026-09-25 — relaunch review (no code changed since 08-06)
- [x] **P1 API hardening** — DONE + LIVE 2026-09-25 (smoke 14/14): shared `lib/tmdb-rules.ts`, smoke script, reach-ranked committed pool, TMDb attribution, caching + rate limit, ESLint, AGENTS.md symlinked
  - [x] Promoted to production 2026-09-25 (push to main auto-deploys) — smoke 14/14 live
  - [ ] Pool overrides: consider adding Sydney Sweeney, Austin Butler (`data/pool-overrides.json`, then `npm run build:pool`)
  - [ ] Monthly: `npm run build:pool` + commit (TMDb 6-month cache cap; smoke fails at 180 days)
- [ ] **Rename** — 2026-09-25: shortlist checked, 4 finalists in https://claude.ai/artifact/D3WuDUd7NJZrXx5Mibsbqp (rec **Casthop** after round 2 — quirky coined word; .com/.game/.app/.io free, no TM filings, @casthop on X taken → @casthopgame free; Bacon names dropped). *Match Cut is OUT* (matchcutdaily.com is a live daily movie-connection game). **2026-09-25: name decision ON HOLD — "Casthop" is the working placeholder.** When ready: pick → registrar check + register domain. Notes: vault `resources/research/2026-09-25-game-name-shortlist.md`
- [x] **Core loop v2** — DONE 2026-09-25, LIVE 2026-09-26 (merged to main, prod smoke 19/19): costar graph + solver, par scoring, paused clock, hint ladder, show-me-a-route, tap-to-close win, route comparison, fair-puzzle floor, Play Again via reveal. Spec `docs/superpowers/specs/2026-09-25-core-loop-v2-design.md`, plan `docs/superpowers/plans/2026-09-25-core-loop-v2.md`. 54 tests, smoke 19/19.
  - [x] Merge + deploy — 2026-09-26, prod smoke 19/19
  - [ ] **Motion values to confirm (Marco):** `lib/motion.ts` — target pulse 1200ms, connector draw 450ms, bounce 1000ms/100ms stagger (Wordle's), settle 500ms. Shake 600ms (Wordle) in `app/globals.css`.
  - [ ] **Rules question (Marco):** voice cameos in long-running animated TV (Family Guy, American Dad!, The Simpsons via `aggregate_credits`) count as links and show up in best routes. Keep, or exclude animation-genre TV guest roles?
  - [ ] Fair-puzzle floor `FAIR_MIN_VOTES = 1000` (`lib/solver/puzzle.ts`) — tune after real play
  - [ ] Monthly: `npm run build:graph` right after `build:pool` + commit `data/costar-graph.json` (graph must match the pool)
  - [x] Design pass items found while building — superseded by Reel Line (cards, connectors and plain lists are gone)
  - [ ] Later: daily puzzle = `pickPuzzle` with a date-seeded rng; Hard mode needs a wider pool (par 3+ is 0.02% of the famous pool); first-visit how-to modal (Wordle pattern)
- [ ] **Design pass (Step 4)** — 2026-09-26 Phase 1 DONE: 3 directions in https://claude.ai/artifact/9ba8WXsiMQy84nBKd5fChF (Cutting Room / Line Map / Casting Board). 09-26 round 2: Marco chose a Line Map + Cutting Room hybrid → **Reel Line** added at top (film-stock lines, reel-hub stations, dark/light ground). **2026-09-26 PICKED: Reel Line, dark** — 35mm reels for actors, film strips hang on verlet physics (drop, swing, clip on, pull taut on close). Next: Marco confirms final values (colors, type, physics/motion) → Phase 2 build, then Phase 2 (tokens → strings → results → a11y → onboarding/polish)
  - [x] **Final values APPROVED 2026-09-27** (Marco: "please continue" after the values table):
    - Colors: ground `#15171B`, surface `#1F2227`, text `#EDEEEA`, secondary `#9EA3AB`, reel `#C9CCD2`; film stock blue `#5B8DEF`, amber `#E0A33A`, red `#F06A5F`, green `#3FB57A` (one per film, in rotation). Mock extras used as-is: reel-dim `#5C616A`, face `#4A4F57`→`#2A2D33`, line `#3A3E45`, divider `#2E3137`, hover `#262A30`, CTA `#EDEEEA` on `#15171B`.
    - Type: Overpass 800 people, 400/600 films + interface; IBM Plex Mono years + timecode. Geist and Playfair removed.
    - Physics: gravity 2200 px/s², damping 0.985, slack 1.10 rest → 1.01 close.
    - Motion: clip-on 280ms, reel click 320ms (slight overshoot), taut 380ms, results slide-up 300ms, wrong-pick shake 600ms.
  - [x] **Phase 2 build DONE 2026-09-27 on branch `reel-line`** (5 commits `b10fe30`…`00ab14b`): tokens + Overpass/Plex Mono → reels + hanging film → results + share card → a11y batch → example line + reveal restyle. Tests 65/65, build clean, smoke 19/19 local, played at 375/1440 incl. reduced motion + keyboard-only.
  - [ ] **Merge + deploy `reel-line`** (Marco plays it first: `npm run dev`, localhost:3005). Push to main auto-deploys; then `npm run smoke -- https://six-degrees-topaz.vercel.app`
  - [ ] **Label chop — Marco to pick (2026-10-02):** a picked film hangs straight down through its actor's name plate and is mostly hidden (worse with 88px bookends). Recommended: hang the film from below the name. Alternatives: strips in front of names / 70% tinted plates / names above reels
  - [x] Pending reel turn — Marco picked 1 turn / 2s (2026-10-02), shipped `81095b9`
  - [ ] **Critique pass 1 DONE 2026-10-02 on branch `reel-line-critique`** (worktree `../six-degrees-critique`, commit `5963a29`, tests 65/65): bookend reels 88/42, phone gap fills the stage, top-films hint = one row of titles, reel exit on undo (entrance reversed), stock order blue→red→green→amber, header "1 hint" casing. Checked at 375 + 1440. Open: label chop (needs Marco's pick; worse now that bookends are bigger), reveal → reel handoff, results strip height, "·Par" separator, Undo/Start over labels + Start over confirm
  - [ ] **Critique follow-ups** (`docs/REEL-LINE-CRITIQUE-2026-09-27.md`): 1) bigger faces (bookend reels at 88/42), 2) labels chop film strips + dangling film hides behind its actor's name, 3) empty phone stage + top-films hint crowding, 4) reels need an exit and the reveal a spatial handoff, 5) amber is both a stock color and the highlight
  - [ ] **Value needed (Marco):** pending state is a static dashed ring; a slow reel turn would read better — needs a speed
  - [ ] Copy changed without sign-off: home description → example line + "Actors in the same movie or show are one film apart…", Easy = "They share a movie or show", results headlines ("Right on par", "Two over par"). Edit freely
  - [ ] **Nimble tidy — interrupted 2026-09-26 by /wrap, NOT done:**
    - Marco said "merge them": move the 7 subtasks and the prompt from "Six Degrees: ship the Reel Line redesign (Step 4)" (`0bd0e5f6…`, renamed from "Finish Six Degrees movie game") under "Make Six Degrees Game go public" (`0d0e7e76…`).
    - Also close go-public's done subtasks: "List out UX improvements", "Audit current implementation", "Identify architecture stability".
    - `dt task update` has no `--parent` flag, so re-parenting means recreating the subtasks under `0d0e7e76` with `--parent`, then completing the old ones.
- [ ] **Launch + money** — send the TMDb commercial-license email early (offered as a Nimble task, not created yet); email TMDb re commercial license EARLY (terms forbid commercial use without agreement); daily puzzle infra; phased plan → Prompt 4

## Parked (from DESIGN-AUDIT-2026-08.md, folded into prompts above)
- Themed pools, async competitive mode, auth/leaderboards
