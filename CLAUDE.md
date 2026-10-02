# Six Degrees — Project Context

## Overview
A public actor-connection game. Given two actors, build a chain of movies and co-stars to connect them in as few steps as possible. Scored like golf: steps (plus hints) against par, the shortest route the solver knows; time only breaks ties. Working name "Six Degrees" ("Casthop" is the placeholder for the rename; nothing renamed in code yet). Forked from the Valentine's "Scream Queens: Six Degrees" project — stripped of all personal content and rebuilt with a generic game loop.

## Safety Rules
- Always commit working state before starting a new feature or risky change
- Make small incremental changes and verify each one works before proceeding
- After any structural change (new component, new context, layout rewrite), verify the dev server before continuing
- If the dev server breaks, revert immediately — do not spiral through 5+ fix attempts
- If 2 consecutive fix attempts fail on the same issue, stop and reassess the approach

## Development Approach
- Propose approach before implementing non-trivial features — outline 2-3 options with tradeoffs
- Prefer the simplest solution that works; do not over-engineer
- Never guess or fabricate values for visual properties (colors, fonts, animation parameters) — ask Marco for exact values
- When something breaks, say so directly rather than silently trying more fixes
- Marco is a designer — defer to his visual judgment, ask for specs when unsure

## Known Gotchas
- **Turbopack root detection** — There's a `package-lock.json` at `~/` that confuses turbopack. Fixed via `turbopack: { root: "." }` in `next.config.ts`. Don't remove this.
- **Turbopack cache corruption** — If the server crashes with "corrupted database" panics, kill the process, `rm -rf .next`, wait a beat, then restart. Don't race the delete and start.
- **Dev server buffering** — If the page buffers indefinitely, kill the server, delete `.next/`, and restart fresh.
- **Actor pool is a committed file** — `data/actor-pool.json`, built by `npm run build:pool`. The pool route makes no TMDb calls. Rebuild at least monthly; TMDb caps cached data at 6 months and `npm run smoke` fails once the file is 180+ days old.
- **One rulebook** — every "does this count as a connection?" decision goes through `lib/tmdb-rules.ts`. Never filter credits inline in a route; that split is how the Kimmel exploit happened.
- **Preview deploys are behind Vercel Authentication** — to smoke-test one, pull the bypass secret via `vercel curl --debug` (recipe at the top of `scripts/smoke.ts`).
- **ESLint 10 + eslint-plugin-react** — the React version must stay pinned in `eslint.config.mjs`; auto-detect crashes on ESLint 10.
- **The costar graph must match the pool** — `data/costar-graph.json` is built from `data/actor-pool.json` by `npm run build:graph` (~100s, ~9k TMDb calls, cached in `.cache/graph-build/`). Rerun it every time the pool changes and commit both. `build:graph` fails if a pool actor is missing from the graph.
- **Tests** — `npm test` runs `node --test` through `npx tsx` (no test deps). Fixture graphs live in `lib/solver/__fixtures__/`. The reducer takes time as `now` on actions; never call `Date.now()` inside `gameReducer`.
- **Dev StrictMode deals twice** — RevealScreen's fetch effect runs twice in dev and keeps one result (cancel flag). Browser tests must read the pair from the screen, not the first `/api/puzzle` response.
- **Motion values** — every motion and physics value (film physics, reel close, reveal, shake, results) is in `lib/motion.ts`; CSS reads them through `--*-ms` variables set inline. Don't hardcode durations elsewhere.
- **Turbopack serves stale `globals.css`** — CSS edits written by a script (python/sed rewrite) were silently missed by the dev server three times on 2026-09-27; edits made with the Edit tool were picked up. After any CSS change, check the served stylesheet contains the new rule (`fetch(document.querySelector('link[rel=stylesheet]').href)`) before trusting a screenshot; if stale, make a small Edit-tool edit or restart with a clean `.next`.
- **Film stage** — `components/round/film-stage.ts` is imperative (canvas + DOM positions); React only says what exists via `lib/reel-model.ts`. Never draw at scale ≤ 0 (`drawFilm` guards it; a hidden canvas once looped forever).

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **Fonts**: Overpass (400/600/800; people 800, films + interface 400/600) + IBM Plex Mono (years, timecode, counts), via `next/font/google`
- **Sound**: Web Audio API synthesized effects (no audio files)
- **State**: React useReducer + Context (no external state library)
- **API**: TMDb (proxied via `/api/tmdb/*` routes to hide key)
- **Deployment**: Vercel (separate project from Valentine's version)
- **Env**: `TMDB_API_KEY` in `.env.local`

## Project Structure
```
app/
  layout.tsx                    # Root layout (Overpass + IBM Plex Mono, viewport meta)
  page.tsx                      # Renders <Game />
  globals.css                   # Tailwind + CSS vars + animations + grain overlay + reduced-motion
  api/tmdb/
    search/route.ts             # Search movies, TV, actors via TMDb (ineligible titles filtered out)
    credits/route.ts            # Get cast list for a movie/show
    validate/route.ts           # Validate actor↔movie connection (player moves; full cast)
    pool/route.ts               # Serves data/actor-pool.json (static, no TMDb calls)
    person/route.ts             # Look up actor by TMDb ID
    filmography/route.ts        # Hint rung 1: an actor's 5 best-known eligible titles
  api/puzzle/route.ts           # Deal a verified pair + par (?difficulty=) or check a share pair (?start=&target=)
  api/route/route.ts            # Best route from any actor to the target (&via= a picked title); bridges off-graph actors
  play/
    page.tsx                    # Share link landing page (/play?pair=id-id) → verified via /api/puzzle → reveal
components/
  Game.tsx                      # State-driven screen switcher + share-link auto-start + phase announcements
  screens/
    HomeScreen.tsx              # Landing — title, example line, difficulty radiogroup, play
    RevealScreen.tsx            # Card-reveal loading animation (pair finding + 3D card flip + fade to reels)
    PlayingScreen.tsx           # Wrapper for ChainBuilder
    ResultsScreen.tsx           # Score reel + your line vs express + share card + play again
  round/
    ChainBuilder.tsx            # Core gameplay: header, ReelStage, bottom panel (hints + search); validate (clock paused), close beat
    ReelStage.tsx               # The line: reels (DOM) + hanging film (canvas), ready/pending/shake states, the close
    film-stage.ts               # Imperative engine behind ReelStage: verlet sim loop, reel + label positions (runs only while moving)
    Reel.tsx                    # ReelPlate (35mm reel SVG) + ReelFace (photo or initials at the hub)
    LineSummary.tsx             # Results: a route as mini reels + strips of stock (express in aluminum)
    ExampleLine.tsx             # Home: the static DiCaprio → Inception → Hardy lesson
    HintLadder.tsx              # Stuck exits: top films → next link (+1 each), Show me a route (give up)
    SearchInput.tsx             # Debounced autocomplete input
    SearchResults.tsx           # Result list (opens upward at every width)
lib/
  types.ts                      # All TypeScript types (GameState, GameAction, Difficulty, etc.)
  actor-pool.ts                 # Pool fetch + client cache, TMDb image URL helpers
  scoring.ts                    # Steps, score vs par, labels, paused-aware elapsed time, share text
  motion.ts                     # Every motion + physics value: FILM_PHYSICS, REEL_MOTION, REVEAL_MOTION
  film-rope.ts                  # Rope (verlet film strip) + drawFilm (35mm stock on canvas) + settle
  reel-model.ts                 # chain → stations (reels) + films (who hangs from whom, stock color)
  reel-layout.ts                # Reel hub positions: phone zigzag, desktop left-to-right; grows and scrolls
  share-card.ts                 # Canvas share card (1.91:1): preview on desktop results, PNG for the phone share sheet
  route-links.ts                # Solver Route → ChainLink[]
  search-rank.ts                # Exact/prefix title matches first in search
  solver/                       # graph.ts (load), search.ts (bidirectional BFS), puzzle.ts (dealing + fair floor),
                                #   bridge.ts (off-graph + via-title routes), server.ts (fs + TMDb source; server only)
  sounds.ts                     # Web Audio API synthesized sounds (card chime, error buzz, win arpeggio, undo crumple, card flip whoosh)
  game-reducer.ts               # useReducer: all game state transitions
  GameContext.tsx                # React Context provider
  tmdb.ts                       # Client fetch helpers (search, validate, fetchPuzzle, fetchPuzzleForPair, fetchRoute, fetchFilmography)
  tmdb-rules.ts                 # THE rulebook: eligible titles, acting roles, credit keys, cast paths
  api-cache.ts                  # TMDb fetch revalidate windows, CDN cache headers, per-IP rate limit
scripts/
  build-pool.ts                 # npm run build:pool → data/actor-pool.json
  build-graph.ts                # npm run build:graph → data/costar-graph.json (run after build:pool)
  smoke.ts                      # npm run smoke -- <baseUrl>: every route + exploit regression checks
data/
  actor-pool.json               # Committed pool snapshot (400 actors, generatedAt)
  costar-graph.json             # Committed solver graph (16.5k actors, 10.7k titles, 1.4 MB)
  pool-overrides.json           # Marco's include/exclude list for the pool
public/
  tmdb-logo-short.svg           # Official TMDb wordmark for the required attribution
hooks/
  useDebounce.ts                # 300ms debounce for search
VIRALITY-RESEARCH.md            # Game monetization + virality research (Wordle case study, growth playbook)
UI-CRITIQUE.md                  # Comprehensive UI/UX critique with prioritized fixes
```

## Game Flow
```
Home (pick difficulty) → Reveal (deals a verified pair + par) → Playing (clock pauses during checks; hints; give up)
  → tap the target to close the chain (beat in the playing view) → Results (score vs par, your route vs best route, share)
  → Play Again (back through Reveal). Share links (/play?pair=) are verified by /api/puzzle, then go through Reveal too.
```

## State Shape
```typescript
{
  phase: "home" | "revealing" | "playing" | "results",
  difficulty: "easy" | "medium" | null,
  actorPair: { start: PoolActor, end: PoolActor } | null,
  par: number | null,                       // set by START_GAME (only from "revealing")
  chain: ChainLink[],
  searchMode: "media" | "person",
  selectedMedia: MediaResult | null,
  startTime, endTime: number | null,
  pausedMs: number, pauseStartedAt: number | null,   // validation time doesn't count
  hintsUsed: number,                         // +1 score each; survives Start over
  hintFilms, hintLink: { actorId, … } | null,        // cleared when the actor/film changes
  closing: boolean,                          // CLOSE_CHAIN → beat → FINISH
  bestRoute: ChainLink[] | null,
  endReason: "won" | "gaveUp" | null,
}
```
Every reducer case guards its phase and returns the same state object for actions that make no sense now (tested in `lib/game-reducer.test.ts`).

## Actor Pool
- **Source**: `scripts/build-pool.ts` → committed `data/actor-pool.json` (400 actors). Same pool on every server, so daily puzzles can depend on it.
- **Ranking ("reach")**: billed cast (top 10) of the 500 most-voted English films, 100 most-voted films of the last 5 years, and 200 most-voted English shows. Each actor earns the title's vote count, weighted by billing order (`1 / (1 + order × 0.25)`), halved for voice-only roles, plus up to +30% for current TMDb popularity. Must have a photo and `known_for_department === "Acting"`.
- **Overrides**: `data/pool-overrides.json` `include` / `exclude` by TMDb id. Seeded with Nicole Kidman, Jackie Chan, Jenna Ortega (the ranking misses stars whose hits aren't blockbusters). Sydney Sweeney and Austin Butler are also missing — add if wanted.
- **Refresh**: `npm run build:pool` monthly, commit the JSON. TMDb's 6-month cache limit is enforced by the smoke test.
- **Known effect**: a famous pool is highly connected: 29% of pool pairs are par 1, 71% par 2, 12 pairs par 3 (graph of 2026-09-25). That's why there is no Hard mode.

## Connection Rules (`lib/tmdb-rules.ts`)
- **Ineligible titles**: genres Documentary 99, News 10763, Reality 10764, Talk 10767, plus TV titles named like awards shows (TMDb leaves The Oscars ungenred). SNL is tagged News, so it's out too: an accepted loss.
- **Non-acting credits**: character matching `self/himself/herself/themselves`, `archive`, or starting with `Host`. Catches awards-show presenters and archive compilations like *Final Cut: Ladies and Gentlemen*.
- **Validate** fetches the title with `append_to_response` (genres + cast in one call) and returns `reason`: `excluded_title | not_in_cast | not_acting_role`.
- **TV casts** use `aggregate_credits` everywhere (via `castPath`).

## Caching & Limits (`lib/api-cache.ts`)
- TMDb fetches: Next data cache, credits/person 3 days, search 1 day.
- Responses: `s-maxage` 1 day (search 1 hour) + 7× stale-while-revalidate. Verified CDN HITs on preview. Errors are never cached.
- Rate limit: per-IP in-memory token bucket, burst 60, 2/s. Per instance, so a speed bump, not a global quota.

## Difficulty, Par and Scoring
- **Par** = the shortest route in the costar graph (bidirectional BFS, ~0.1 ms). Ties prefer the best-known titles. The graph is pruned (top-15 billed, 100+ votes), so a player can **beat par** with an obscure film: "Under par!".
- **Difficulty = par band:** Easy = par 1, Medium = par 2. **No Hard mode:** only 12 of 79,800 pool pairs are par 3 with the famous pool (2026-09-25). A wider pool is the way back to Hard.
- **Fair puzzles:** a dealt pair's best route must use only titles with ≥ `FAIR_MIN_VOTES` (1000) TMDb votes, so par never hinges on an obscure TV special. Keeps ~70% of par-1 and 92% of par-2 pairs.
- **No unverified pairs anywhere:** `/api/puzzle` either returns a solved pair or an error (Reveal shows Retry; bad share links show a dead-end screen).
- **Score** = steps (titles) + hints − par. Labels: "Under par!" / "Par" / "+N"; give-up shows "Gave up". Time (minus paused validation time) is a small tiebreaker line.
- **Share text** (spoiler-free): `Six Degrees · Par 2` / `🟦🟥🟩💡 +2` / link: one square of film stock per film. Share sheet on phones (with the PNG card when it takes files), clipboard elsewhere.

## Design Tokens (Reel Line, dark — approved 2026-09-27)
All tokens live in `@theme static` in `app/globals.css`, so they work as CSS variables (`var(--color-bg)`) and as Tailwind utilities (`bg-surface`, `text-text-secondary`, `border-border`, `rounded-md`, `text-2xs`).

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#15171B` | Ground (page, label plates, sprocket holes) |
| `--color-surface` | `#1F2227` | Inputs, results list, cards |
| `--color-text` | `#EDEEEA` | Primary text |
| `--color-text-secondary` | `#9EA3AB` | Secondary text (passes AA on ground and surface) |
| `--color-border` | `#3A3E45` | Input and button outlines |
| `--color-divider` | `#2E3137` | Rows inside a surface |
| `--color-hover` | `#262A30` | Row hover / highlighted option |
| `--color-reel` / `--color-reel-dim` | `#C9CCD2` / `#5C616A` | Reel aluminum / a reel you can't reach yet |
| `--color-face-1` → `--color-face-2` | `#4A4F57` → `#2A2D33` | Hub gradient behind initials |
| `--color-cta-bg` / `--color-cta-fg` | `#EDEEEA` / `#15171B` | Primary buttons (light on dark) |
| `--color-stock-blue/red/green/amber` | `#5B8DEF` `#F06A5F` `#3FB57A` `#E0A33A` | Film stock, one per film in this order (amber last since 2026-10-02) (`lib/reel-model.ts` STOCKS) |
| `--color-accent` | `#E0A33A` | The one highlight: tap-to-connect ring, pending ring, focus ring, selected radio |
| `--color-error` | `#FF6B6B` | Error text |

No per-difficulty accent any more (removed 2026-09-27).

### Typography
Overpass everywhere, IBM Plex Mono for years, timecode and counts. Scale (px): `2xs` 11 · `xs` 12 · `sm` 13 · `md` 14 · `base` 16 · `lg` 20 · `xl` 22 · `2xl` 36 · `3xl` 48. Inputs stay 16px so iOS never zooms. People 800, films 600, interface 400. Sentence case; no tracked uppercase labels.

### Radius
`--radius-sm` 4px (label plates), `--radius-md` 10px (inputs, buttons, panels). Reels are circles.

## Component Specs

### The line (`ReelStage` + `film-stage.ts`)
- **Reel**: 64px (start + target "bookend" reels 88px with a 42px face, since 2026-10-02), `ReelPlate` (plate r31, six cut-outs r5.4 at r21) + 30px face at the hub + name plate below (800 14px, max 130px, balanced wrap).
- **States**: target `waiting` (dim plate) → `ready` (amber ring breathing at `readyPulseMs`, "Tap/Click to connect") → `closed`. Current actor `pending` (dashed amber ring, the reel turns once per `pendingTurnMs` 2000ms, "Checking…").
- **Film**: verlet rope, 18 points, 16px stock with sprocket holes + frame lines. Dangling film = 120px, labeled at its free end; hung film labeled under its middle.
- **Layout** (`lib/reel-layout.ts`): phones zigzag (x 27% / 73%, gap ≥140px, stretched to fill the stage); ≥768 runs left to right (spacing 180–480px, centered). Either grows past the viewport and the stage scrolls to keep the current actor in view.
- **No idle motion**: the sim stops after 40 still frames. Reduced motion settles everything instantly.
- Undo + Start over: 44px icon buttons in the stage's top-right corner.

### Motion (`lib/motion.ts`)
- Physics: gravity 2200 px/s², damping 0.985, slack 1.10 rest → 1.01 close → 1.078 relax.
- Close: clip-on 280ms (40px lift) → reel click 320ms, `cubic-bezier(.2,.8,.2,1.25)` → +420ms taut 380ms → settle 900ms → results (1980ms total). Tap anywhere skips.
- Reels arrive with a 280ms scale-in and leave (undo) with the same animation reversed. Wrong pick: 600ms shake on the current reel + search, plus `playErrorSound`.
- Results slide up 300ms `cubic-bezier(.2,0,0,1)`.
- Reveal: flips at 500 / 1500ms (500ms each), title at 2500ms, cards fade out at 4500ms (500ms), START_GAME at 5000ms.

### Sound Effects (`lib/sounds.ts`)
All synthesized via Web Audio API — no audio files needed.
| Sound | Trigger | Description |
|-------|---------|-------------|
| `playCardSound()` | Valid media/person selected | Ascending sine chime (660→880Hz, 250ms) |
| `playErrorSound()` | Rejected pick | Two short triangle buzzes (196→147Hz, 80ms, 90ms apart) |
| `playRemoveSound()` | Undo or reset | Descending triangle thud (400→180Hz) + noise burst |
| `playWinSound()` | Target tapped (chain closes) | C major arpeggio (C5-E5-G5-C6, 120ms spacing) |
| `playFlipSound()` | Card flip during reveal | Bandpass-filtered noise burst + sine undertone (~300ms) |

### Results + share
- Score sits in an 88px reel hub (`+2`, `Par`, `−1`, `—`), headline in words (`scoreHeadline`), then "Your line" beside "Express (par N)" as `LineSummary`.
- Wide screens show the share card preview + share text beside it. Phones share the PNG card with the text when the share sheet takes files.
- Share text: `Six Degrees · Par 2` / `🟦🟧💡 +1` / link (one square of stock per film, 💡 per hint).

### Accessibility
Amber `:focus-visible` ring (round on reels; inputs use their border), styled `::selection`, `user-select: none` on buttons, 44px minimum targets, pinch zoom allowed, difficulty radiogroup with arrow keys, `aria-live` for picks / checking / round start, results focus their headline, search keeps focus through checks (read-only, never disabled).

### Mobile
Target 375px+. Search + hints sit at the bottom of an `h-dvh` column (not fixed) with the safe-area inset; results open upward at every width.

## Backlog

### High Priority (usability — from UI critique)
- [x] Sharing via URL route handler (`/play?pair=id-id&d=difficulty`)
- [x] Fix error color collision with hard-mode accent (`--color-error` → `#FF6B6B`)
- [x] Add network error handling in validation (try/catch around validateConnection)
- [x] Add clipboard copy confirmation on share ("Copied!" flash)
- [x] Remove global `font-semibold` from body
- [x] Add keyboard navigation to search results (arrow keys, Enter, Escape, ARIA combobox)
- [x] Card-reveal loading screen (3D flip animation, replaces dead wait)

### Medium Priority (polish)
- [x] Fix difficulty classifier — filter non-acting credits, key on `media_type:id`, sort by `vote_count` (2026-08-06)
- [x] Solver + par (2026-09-25) — Hard mode removed instead: the famous pool has almost no par-3 pairs
- [x] ESLint flat config (`eslint.config.mjs`) — `npm run lint` runs; 0 errors, 12 warnings (2026-09-25)
- [x] Accent on difficulty selection — moot: per-difficulty accent removed in Reel Line (2026-09-27)
- [x] Secondary text contrast — `#9EA3AB` passes AA (2026-09-27)
- [x] Error/invalid sound — `playErrorSound` (2026-09-27)
- [x] Idle bob/sway — gone; nothing moves unless the player acted (2026-09-27)
- [ ] Reel Line follow-ups — see `docs/REEL-LINE-CRITIQUE-2026-09-27.md` (bigger faces, labels chopping strips, empty phone stage, reel exits, amber's two jobs)

### Lower Priority (features + delight)
- [ ] Async competitive mode (challenge a friend with same pair)
- [ ] Daily puzzle (seed-based pair generation — stub exists in `getPairForDate`)
- [ ] Themed actor pools (horror, comedy, etc.)
- [ ] Lightweight auth (Google/GitHub) for stats + leaderboards
- [x] Optimal-path comparison on results (2026-09-25, plain lists; styling in the design pass)
- [ ] Step counter during gameplay
- [x] Onboarding: example line on home (2026-09-27); a first-visit how-to modal is still open

## Session End
Before ending any session:
1. Update the "Current State" section below
2. Note exact file paths that were modified
3. If any features are partially complete, describe what's left

## Current State
_Updated by Claude — 2026-10-02 (Session 8, critique pass 1)_
- **Branch `reel-line-critique`** (worktree `../six-degrees-critique`, off `reel-line`, not merged/pushed): `5963a29` bookend reels 88/42, phone gap fills stage, top-films hint = title row, reel exit on undo, stock order blue→red→green→amber, header casing; `81095b9` pending reel turn 2s (Marco's value). Tests 65/65, tsc clean, checked at 375 + 1440 in Playwright.
- **Waiting on Marco:** label chop fix (recommended: a picked film hangs from below its actor's name); he hasn't played `reel-line` yet. Remaining critique items in `NEXT.md`.

_Updated by Claude — 2026-09-27 (Session 7, relaunch step 4 phase 2: Reel Line build)_
- **Built on branch `reel-line` (not merged, not deployed):** five commits `b10fe30` tokens → `39814b0` reels + hanging film → `c9f389c` results + share card → `2d075eb` accessibility → `00ab14b` onboarding line, reveal restyle, polish. Values approved by Marco 2026-09-27 (recorded in `NEXT.md`).
- **Verified locally:** `npm test` 65/65, `npm run lint` 0 errors, `npm run build` clean, `npm run smoke -- http://localhost:3005` 19/19. Played in Playwright at 375 and 1440: Easy + Medium wins, wrong pick (shake + sound), undo (film falls back), hints, give up, Play Again, reduced motion, and one full round keyboard-only.
- **Critique:** `docs/REEL-LINE-CRITIQUE-2026-09-27.md`. Top items: faces too small (30px hub), labels chop strips, empty phone stage, reels have no exit, amber is both a stock color and the highlight.
- **Open for Marco:** play it (`npm run dev`, port 3005) and decide merge; pending-state motion (a slow reel turn needs a value); critique items; the voice-cameo rules call still stands (Family Guy / The Simpsons keep showing up in best routes).

### Session 6 (2026-09-25, relaunch step 3: core loop v2)
- Core loop v2 live 2026-09-26 (prod smoke 19/19): costar graph + solver, par scoring, paused clock, hint ladder, give up, tap-to-close win, route comparison, fair-puzzle floor, Play Again via reveal.

### Session 5 (2026-09-25, relaunch step 1: API hardening)
- Deployed to production; smoke 14/14. Shared rulebook `lib/tmdb-rules.ts`, `scripts/smoke.ts`, committed reach-ranked pool, TMDb attribution, caching + rate limit, ESLint config, `AGENTS.md` symlink.

### Session 4 (2026-08-06)
- Shipped `RevealScreen` (`7c37b34`) and fixed the difficulty classifier (`61f138f`): combined_credits includes talk shows, awards, documentaries and archive compilations, so nearly every pair looked 1 step apart. Verified 14 pairs → 4 easy / 9 medium / 1 hard at the time.
- Known trap (still true): if all 8 pair-finding attempts miss, `RevealScreen` starts an **unverified** pair wearing the requested difficulty label.

### Session 3 (2026-02-10)
- **Completed:**
  - Share route handler: `/play?pair=id-id&d=difficulty` with `fetchPerson()` helper, auto-start via `initialPair` prop
  - Person API route: `/api/tmdb/person` for looking up actors by TMDb ID
  - Error color fix: `--color-error` changed to `#FF6B6B` (distinct from hard-mode accent)
  - Network error handling: try/catch around `validateConnection` calls in ChainBuilder
  - Clipboard copy confirmation: "Copied!" flash state on Share button in ResultsScreen
  - Removed global `font-semibold` from body in layout.tsx
  - Keyboard navigation on search results: arrow keys, Enter, Escape with ARIA combobox attributes
  - Card-reveal loading screen: full `RevealScreen.tsx` with 3D card flip, whoosh sound, title reveal, slide-to-edges animation
  - `playFlipSound()` in sounds.ts: bandpass-filtered noise + sine undertone
  - `"revealing"` game phase + `BEGIN_REVEAL` action added to types/reducer
  - HomeScreen simplified: pair-finding moved to RevealScreen, Play button always shows "Play"
- **Modified files:** `app/globals.css`, `app/layout.tsx`, `app/play/page.tsx` (new), `app/api/tmdb/person/route.ts` (new), `components/Game.tsx`, `components/screens/HomeScreen.tsx`, `components/screens/RevealScreen.tsx` (new), `components/screens/ResultsScreen.tsx`, `components/round/ChainBuilder.tsx`, `components/round/ChainCard.tsx`, `components/round/SearchInput.tsx`, `components/round/SearchResults.tsx`, `lib/types.ts`, `lib/game-reducer.ts`, `lib/sounds.ts`, `lib/tmdb.ts`
- **Open from this session:** RevealScreen slide-to-edges end positions are close but not pixel-perfect against PlayingScreen. `--color-text-secondary` fails WCAG AA contrast. Reveal-to-playing transition has a brief "pop" when the component switches (accepted by Marco as OK).
