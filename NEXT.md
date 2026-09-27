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
  - [ ] Design pass items found while building: the closing connector draws beside the pinned target, not across the gap (1440); start card scrolls off-screen at 375 on round start; results layout is plain lists
  - [ ] Later: daily puzzle = `pickPuzzle` with a date-seeded rng; Hard mode needs a wider pool (par 3+ is 0.02% of the famous pool); first-visit how-to modal (Wordle pattern)
- [ ] **Design pass (Step 4)** — 2026-09-26 Phase 1 DONE: 3 directions in https://claude.ai/artifact/9ba8WXsiMQy84nBKd5fChF (Cutting Room / Line Map / Casting Board). 09-26 round 2: Marco chose a Line Map + Cutting Room hybrid → **Reel Line** added at top (film-stock lines, reel-hub stations, dark/light ground). **2026-09-26 PICKED: Reel Line, dark** — 35mm reels for actors, film strips hang on verlet physics (drop, swing, clip on, pull taut on close). Next: Marco confirms final values (colors, type, physics/motion) → Phase 2 build, then Phase 2 (tokens → strings → results → a11y → onboarding/polish)
  - [x] **Final values APPROVED 2026-09-27** (Marco: "please continue" after the values table):
    - Colors: ground `#15171B`, surface `#1F2227`, text `#EDEEEA`, secondary `#9EA3AB`, reel `#C9CCD2`; film stock blue `#5B8DEF`, amber `#E0A33A`, red `#F06A5F`, green `#3FB57A` (one per film, in rotation). Mock extras used as-is: reel-dim `#5C616A`, face `#4A4F57`→`#2A2D33`, line `#3A3E45`, divider `#2E3137`, hover `#262A30`, CTA `#EDEEEA` on `#15171B`.
    - Type: Overpass 800 people, 400/600 films + interface; IBM Plex Mono years + timecode. Geist and Playfair removed.
    - Physics: gravity 2200 px/s², damping 0.985, slack 1.10 rest → 1.01 close.
    - Motion: clip-on 280ms, reel click 320ms (slight overshoot), taut 380ms, results slide-up 300ms, wrong-pick shake 600ms.
  - [ ] Phase 2 build, 5 items (tokens → reels + hanging film → results/share → a11y → onboarding/polish). Paste-ready prompt in the Nimble parent task
  - [ ] **Nimble tidy — interrupted 2026-09-26 by /wrap, NOT done:**
    - Marco said "merge them": move the 7 subtasks and the prompt from "Six Degrees: ship the Reel Line redesign (Step 4)" (`0bd0e5f6…`, renamed from "Finish Six Degrees movie game") under "Make Six Degrees Game go public" (`0d0e7e76…`).
    - Also close go-public's done subtasks: "List out UX improvements", "Audit current implementation", "Identify architecture stability".
    - `dt task update` has no `--parent` flag, so re-parenting means recreating the subtasks under `0d0e7e76` with `--parent`, then completing the old ones.
- [ ] **Launch + money** — send the TMDb commercial-license email early (offered as a Nimble task, not created yet); email TMDb re commercial license EARLY (terms forbid commercial use without agreement); daily puzzle infra; phased plan → Prompt 4

## Parked (from DESIGN-AUDIT-2026-08.md, folded into prompts above)
- Themed pools, async competitive mode, auth/leaderboards
