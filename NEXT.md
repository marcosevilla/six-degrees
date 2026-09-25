# Six Degrees — Open Loops

**Tracker (tick boxes here):** https://claude.ai/artifact/RDcTCkgjzBstWVz12XAYcH — db doc `steps/s1`…`s5`, field `checks.<id>`; title pick in `decisions/main`
Full analysis + build prompts: `~/Obsidian/marcowits/resources/research/2026-09-25-six-degrees-relaunch-analysis.md`

## 2026-09-25 — relaunch review (no code changed since 08-06)
- [x] **P1 API hardening** — DONE + LIVE 2026-09-25 (smoke 14/14): shared `lib/tmdb-rules.ts`, smoke script, reach-ranked committed pool, TMDb attribution, caching + rate limit, ESLint, AGENTS.md symlinked
  - [x] Promoted to production 2026-09-25 (push to main auto-deploys) — smoke 14/14 live
  - [ ] Pool overrides: consider adding Sydney Sweeney, Austin Butler (`data/pool-overrides.json`, then `npm run build:pool`)
  - [ ] Monthly: `npm run build:pool` + commit (TMDb 6-month cache cap; smoke fails at 180 days)
- [ ] **Rename** — 2026-09-25: shortlist checked, 4 finalists in https://claude.ai/artifact/D3WuDUd7NJZrXx5Mibsbqp (rec **Casthop** after round 2 — quirky coined word; .com/.game/.app/.io free, no TM filings, @casthop on X taken → @casthopgame free; Bacon names dropped). *Match Cut is OUT* (matchcutdaily.com is a live daily movie-connection game). **2026-09-25: name decision ON HOLD — "Casthop" is the working placeholder.** When ready: pick → registrar check + register domain. Notes: vault `resources/research/2026-09-25-game-name-shortlist.md`
- [ ] **Core loop v2** — BFS solver + par scoring, hints/give-up, tappable-target win moment, kill unverified fallback, reset timer on Start over → Prompt 3
- [ ] **Design pass** — 3 directions artifact → build chosen; connectors, results layout, a11y batch → Prompt 5
- [ ] **Launch + money** — email TMDb re commercial license EARLY (terms forbid commercial use without agreement); daily puzzle infra; phased plan → Prompt 4
- [ ] Commit or delete untracked `AGENTS.md`

## Parked (from DESIGN-AUDIT-2026-08.md, folded into prompts above)
- Themed pools, async competitive mode, auth/leaderboards
