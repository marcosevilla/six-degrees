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
- [ ] **Design pass (Step 4)** — 2026-09-26 Phase 1 DONE: 3 directions in https://claude.ai/artifact/9ba8WXsiMQy84nBKd5fChF (Cutting Room / Line Map / Casting Board). 09-26 round 2: Marco chose a Line Map + Cutting Room hybrid → **Reel Line** added at top (film-stock lines, reel-hub stations, dark/light ground). **Waiting on Marco: confirm Reel Line + ground**, then Phase 2 (tokens → strings → results → a11y → onboarding/polish)
- [ ] **Launch + money** — email TMDb re commercial license EARLY (terms forbid commercial use without agreement); daily puzzle infra; phased plan → Prompt 4

## Parked (from DESIGN-AUDIT-2026-08.md, folded into prompts above)
- Themed pools, async competitive mode, auth/leaderboards
