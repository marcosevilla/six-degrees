# Core loop v2 — par, solver, stuck exits, win moment

**Date:** 2026-09-25 · **Status:** design approved in chat, spec awaiting review
**Source brief:** Prompt 3 in `~/Obsidian/marcowits/resources/research/2026-09-25-six-degrees-relaunch-analysis.md` (§3 lists the flaws this fixes)
**Name:** the game is still "Six Degrees" in code. "Casthop" is only a placeholder; nothing gets renamed here.

## Goal

Turn "type fast until you find a path" into a fair recall game. You score on steps against par. There is always a way out when you're stuck. The win feels like a win.

## Decisions (Marco, 2026-09-25)

| Decision | Choice | Why |
|---|---|---|
| Solver architecture | **Hybrid**: an offline graph for puzzles, par and hints; the existing `validate` route for player moves | Measured below. Starting a puzzle costs 0 TMDb calls and under 1 ms, and every pair is verified. |
| Difficulty | **Easy (par 1) and Medium (par 2) only.** Hard is removed. | Only 23 of 79,800 pool pairs have par 3 or more. The old "Hard" was a sampling miss, not a real 3-step pair. |
| Win timings | Proposed values are placeholders in one constants file. Marco sets the final ones. | The brief says to ask for motion values rather than invent them. |

## Measurements (spike, 2026-09-25; throwaway scripts in the session scratchpad)

| | Offline graph (K15, V≥100) | On-demand bidirectional BFS against TMDb |
|---|---|---|
| Size | 8,829 titles · 48,834 actors · 133,090 edges · 2.25 MB JSON with names (1.0 MB gzipped) | none |
| Build | 9,230 TMDb calls, about 5 min (full rebuild) | none |
| Solve one pair | p50 0.016 ms · p95 0.036 ms | p50 288 ms (par 2) · 5.0 s (par 3) · max 8.9 s |
| TMDb calls per puzzle | 0 | 2 (par 1) · 22 (par 2) · 224 (par 3) |
| Correctness | exact within the graph | missed 2 real par-2 routes (top-10 sampling) |

Par split across pool pairs: par 1 = 25.6%, par 2 = 74.4%, par 3 = 0.03%. Adding 4,102 more titles with 500+ votes changed zero pars, so the pool-seeded graph is complete for pool pairs.

## Architecture

```
scripts/build-graph.ts ──(monthly, with build:pool)──▶ data/costar-graph.json
                                                          │  read once per server instance
lib/solver/graph.ts   decode + index                      ▼
lib/solver/search.ts  bidirectional BFS ─▶ app/api/puzzle  (start, target, par)
                                        ─▶ app/api/route   (best route from any actor to the target)
player moves ─▶ app/api/tmdb/validate (unchanged: checks full cast, so obscure films can beat par)
```

### 1. Graph build: `scripts/build-graph.ts`, run with `npm run build:graph`

- **Input:** `data/actor-pool.json`, plus TMDb person `combined_credits` and title `credits` / `aggregate_credits`.
- **Rules:** everything goes through `lib/tmdb-rules.ts` (`isActingRole`, ineligible genres, the awards-show filter). Pool actors keep all their eligible acting credits. Each title contributes its top 15 billed cast, and only titles with 100+ votes count.
- **Pruning:** drop non-pool actors who appear in only one title. They can never sit in the middle of a route, and the spike found 32,323 of them.
- **Output:** `data/costar-graph.json` → `{ builtAt, params, actors: [[id, name]], titles: [[id, name, "movie"|"tv", year]], cast: number[][] }`. `cast[t]` lists the actor indices in title `t`.
- **Rate:** at most 10 requests in flight. Responses are cached to disk under `.cache/graph-build/` (gitignored) so reruns are cheap.
- **Checks built into the script:** it fails if any pool actor is missing from the graph, and it prints a par histogram for all pool pairs.
- It is committed as a static data file, like `actor-pool.json`. It is read only on the server and never imported by client components.

### 2. Solver: `lib/solver/`

Pure functions with no I/O, tested against fixture graphs.

- `graph.ts`: `loadGraph(json) → Graph` builds actor-to-titles and title-to-actors adjacency and id↔index maps. `getGraph()` is a module-level lazy singleton that reads the file with `fs` on first use.
- `search.ts`: `shortestRoute(graph, fromActorId, toActorId) → Route | null`.
  - It runs a bidirectional BFS over the two-sided actor/title graph.
  - `Route` is the alternating list `[actor, title, actor, …, actor]`, with ids and names.
  - `par = route.titles.length`. Ties break deterministically on the lowest index, so tests are stable.
- `puzzle.ts`: `pickPuzzle(graph, pool, difficulty, rng) → { start, target, par }`. It samples pool pairs with an unbiased shuffle until par matches the band (easy = 1, medium = 2), and gives up after 200 samples. The expected number of samples is about 4 for easy and about 1.3 for medium. `rng` is injected so tests can control it.

### 3. API routes

Both routes use the existing `rateLimit` and `cachedJson` from `lib/api-cache.ts`.

- `GET /api/puzzle?difficulty=easy|medium` → `{ start: PoolActor, target: PoolActor, par }`. It does **not** include the route.
- `GET /api/puzzle?start=<id>&target=<id>` (share links) → the same shape. If there is no route, or either id isn't a pool actor, it returns `404 { error }`. The client shows "This link's puzzle can't be played" with a New puzzle button. It never falls back silently.
- `GET /api/route?from=<actorId>&to=<targetId>` → `{ route, par }`.
  - If `from` isn't in the graph (the player went through an obscure credit), the route **bridges**: it fetches that actor's eligible credits from TMDb (cached), then the casts of their top titles by vote count, stopping at the first graph actor found. The spike put this at about 22 calls and 0.3 s.
  - If bridging fails, it returns `404`, and the client offers "Show me a route" from the start actor instead.
- `app/api/tmdb/verify-pair/route.ts` is **deleted**, along with its client helper and its case in `scripts/smoke.ts`. `smoke.ts` gains cases for `/api/puzzle` and `/api/route`.

### 4. Game state: `lib/types.ts`, `lib/game-reducer.ts`

- `Difficulty = "easy" | "medium"`.
- New `GameState` fields:
  - `par: number | null`
  - `hintsUsed: number`
  - `hintFilms: MediaResult[] | null`, from hint rung 1
  - `revealedLinks: ChainLink[]`, from hint rungs 2 and up
  - `bestRoute: ChainLink[] | null`, filled on give-up or at the end
  - `endReason: "won" | "gaveUp" | null`
  - `pausedMs: number` and `pauseStartedAt: number | null`
- Actions:
  - `START_GAME { pair, difficulty, par }`
  - `PAUSE_TIMER` and `RESUME_TIMER`, sent around validation calls
  - `USE_HINT_FILMS { films }` and `USE_HINT_LINK { link }`, each adding +1 to `hintsUsed`
  - `CLOSE_CHAIN`: the target was tapped and the circuit-close beat starts. The phase stays `playing` and a `closing: true` flag is set.
  - `FINISH { bestRoute }`: moves to `results` with `endReason: "won"`.
  - `GIVE_UP { bestRoute }`: moves to `results` with `endReason: "gaveUp"`.
  - `RESET_CHAIN` now also resets `startTime` and the pause fields. Hints used stay counted, because resetting shouldn't erase their cost.
- **No invalid states.** In `results`, `endReason` and `endTime` are set. In `playing`, `par` is set. `SELECT_PERSON` on the target no longer jumps to results. The reducer ignores actions that make no sense for the current phase and returns the same state. Reducer tests assert each of these rules.

### 5. Scoring: `lib/scoring.ts`

- `score = steps + hintsUsed − par`, where `steps` is the number of titles in the player's chain.
- `getScoreLabel(score)`: below 0 is "Under par!", 0 is "Par", and above 0 is "+N". Giving up shows "Gave up" and has no score.
- `elapsed = endTime − startTime − pausedMs`. It appears as a small tiebreaker stat and never goes into the label.
- The share text is par-relative. For example: `Six Degrees · Par 2 · 🎬↷🎬↷🎯 +1 · 💡1`. The 💡N part appears only when hints were used. The exact emoji grammar can change in the design pass.

### 6. Stuck exits: `ChainBuilder` and a new `HintLadder`

- **Start over** resets the chain and the timer.
- **Hint ladder** is one button whose label names the next rung and its cost:
  1. "Hint: 5 films (+1)" shows the current actor's top 5 eligible titles by popularity, from the existing credits route.
  2. "Hint: next link (+1)" calls `/api/route` from the current actor, then shows the next title and actor on the best route as a ghost card. This rung can repeat, +1 each time.
- **Show me a route** asks for confirmation inside the page (never `confirm()`), fetches `/api/route` from the start actor, and sends `GIVE_UP`.

### 7. Win moment: `PlayingScreen`, `ChainDisplay`, `lib/motion.ts`

- When `selectedMedia`'s cast includes the target (already checked by `validate`), the target card pulses and reads "Tap to close the chain". It is a real button and works with the keyboard.
- Tapping it sends `CLOSE_CHAIN`. In the playing view, the final connector draws and `playWinSound()` plays the arpeggio. After the hold, `FINISH` goes to results.
- **Placeholder timings** in `lib/motion.ts`, where Marco sets the final values:
  - pulse loop 1200 ms
  - connector draw 450 ms ease-out
  - arpeggio notes at 0, 110 and 220 ms
  - hold 700 ms
  - crossfade to results 300 ms
- With `prefers-reduced-motion`, there is no pulse or draw, the sound still plays, and results appear after the hold.

### 8. Results and Play Again

- Results show two plain lists, "Your route (N)" and "Best route (par P)". Each list alternates actor and title names. The styling is left to the design pass.
- Play Again sends `BEGIN_REVEAL` with the same difficulty, so it goes through `RevealScreen`. The 5-attempt loop and unverified fallback in `ResultsScreen` are deleted.
- `RevealScreen` calls `/api/puzzle`. If that fails, it shows a retry state. The 8-attempt loop and the silent unverified fallback are deleted.

## Error handling

| Failure | Behavior |
|---|---|
| `/api/puzzle` 5xx or timeout | RevealScreen shows "Couldn't deal a pair" with a Retry button. It never uses an unverified pair. |
| Share link has no route | "This link's puzzle can't be played" with a New puzzle button |
| Bridging in `/api/route` fails | The hint says "No hint from here. Try Start over or Show me a route" and costs nothing. |
| `validate` fails (network) | Existing error path; the pause is released in `finally` |
| Graph file missing or corrupt | `getGraph()` throws, and the routes return 503. The smoke test catches this before deploy. |

## Testing

- **Runner:** `npm test` → `npx --yes tsx --test "lib/**/*.test.ts"`. This adds no dependencies and uses the same `npx tsx` pattern as the existing scripts.
- **TDD, tests first,** for `lib/solver/*` with fixture graphs in `lib/solver/__fixtures__/`. Cases:
  - direct costars (par 1)
  - two hops (par 2)
  - disconnected (null)
  - `from === to`
  - deterministic tie-break
  - an actor missing from the graph
  - the band sampler hitting its cap
- **Reducer tests:** every new action, the invalid-state guards, `RESET_CHAIN` resetting time, and the hint cost persisting across reset.
- **Scoring tests:** labels at −1, 0, +1 and +3, gave-up, and elapsed time minus paused time.
- **Real app, after each numbered build item:** play one full round each of Easy and Medium in Playwright at 375px and 1440px, with screenshots or notes in the session. Also run `npm run smoke` against a Vercel preview.

## Done means

- `npm test`, `npm run lint` and `npm run build` pass.
- Puzzles start from `/api/puzzle` with 0 TMDb calls. "Hard starts in under 3 s" no longer applies, because Hard was removed on 2026-09-25.
- No code path can reach an unverified pair. A grep for `verify-pair` and the fallback branches comes back empty.
- Scoring is par-relative across the whole game: state, labels, results and share text.
- `CLAUDE.md` Current State and `NEXT.md` are updated, and the tracker items are ticked only after they're verified.

## Out of scope

- The visual redesign (Prompt 5)
- The daily puzzle and `getPairForDate`
- Stats and streaks
- A wider actor pool
- The rename

## Commit sequence (one commit per build item)

1. Solver, graph build and par in game state. This covers the `/api/puzzle` route, deleting verify-pair, and the RevealScreen change.
2. Par-relative scoring and a paused timer
3. Stuck exits: timer reset, hint ladder and show a route
4. Win moment with the placeholder timings
5. Results comparing your route with the best route
6. Play Again through the reveal
