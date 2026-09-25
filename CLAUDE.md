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
- **Motion values** — every win-moment timing is in `lib/motion.ts`; don't hardcode durations elsewhere.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **Fonts**: Geist Sans (primary) + Playfair Display (serif, results score label only)
- **Sound**: Web Audio API synthesized effects (no audio files)
- **State**: React useReducer + Context (no external state library)
- **API**: TMDb (proxied via `/api/tmdb/*` routes to hide key)
- **Deployment**: Vercel (separate project from Valentine's version)
- **Env**: `TMDB_API_KEY` in `.env.local`

## Project Structure
```
app/
  layout.tsx                    # Root layout (Geist Sans + Playfair Display, viewport meta, grain-bg)
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
  Game.tsx                      # State-driven screen switcher + difficulty-based accent color + share-link auto-start
  screens/
    HomeScreen.tsx              # Landing — branding + difficulty picker + play button
    RevealScreen.tsx            # Card-reveal loading animation (pair finding + 3D card flip + slide to edges)
    PlayingScreen.tsx           # Wrapper for ChainBuilder
    ResultsScreen.tsx           # Score + completed chain + share + play again
  round/
    ChainBuilder.tsx            # Core gameplay: search + validate (clock paused) + chain + close-the-chain beat
    HintLadder.tsx              # Stuck exits: top films → next link (+1 each), Show me a route (give up)
    RouteList.tsx               # Plain route list for results (your route vs best route)
    ChainDisplay.tsx            # Horizontal scrollable card strip + scroll hint gradient
    ChainCard.tsx               # Individual card + connector + placeholder
    SearchInput.tsx             # Debounced autocomplete input
    SearchResults.tsx           # Dropdown result list (upward on mobile)
lib/
  types.ts                      # All TypeScript types (GameState, GameAction, Difficulty, etc.)
  actor-pool.ts                 # Pool fetch + client cache, TMDb image URL helpers
  scoring.ts                    # Steps, score vs par, labels, paused-aware elapsed time, share text
  motion.ts                     # Win-moment timings (pulse, connector draw, Wordle bounce, settle)
  route-links.ts                # Solver Route → ChainLink[]
  search-rank.ts                # Exact/prefix title matches first in search
  solver/                       # graph.ts (load), search.ts (bidirectional BFS), puzzle.ts (dealing + fair floor),
                                #   bridge.ts (off-graph + via-title routes), server.ts (fs + TMDb source; server only)
  sounds.ts                     # Web Audio API synthesized sounds (card chime, win arpeggio, undo crumple, card flip whoosh)
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
- **Share text** (spoiler-free): `Six Degrees · Par 2` / `🎬🎬🎬 💡 · +2` / link. Share sheet on phones, clipboard elsewhere.

## Design Tokens (CSS Variables)

### Colors — Dark A24 palette
| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg` | `#0A0A0A` | Page background |
| `--color-surface` | `#141414` | Card/input backgrounds |
| `--color-border` | `#222222` | Borders, dividers |
| `--color-text` | `#FAFAFA` | Primary text |
| `--color-text-secondary` | `#666666` | Labels, secondary text |
| `--color-accent` | Dynamic per difficulty | CTA buttons, highlights, connectors |
| `--color-accent-rgb` | Dynamic per difficulty | For rgba() usage |
| `--color-error` | `#FF6B6B` | Error messages |
| `--color-success` | `#4ade80` | Success states |

### Difficulty-Based Accent Colors
Set dynamically via `document.documentElement.style.setProperty` in `Game.tsx`:
| Difficulty | Hex | RGB | Description |
|-----------|-----|-----|-------------|
| Easy | `#4ade80` | `74, 222, 128` | Green |
| Medium | `#E8547C` | `232, 84, 124` | Coral pink |
| Hard | `#E63946` | `230, 57, 70` | Blood red |
| Default (no selection) | `#E63946` | `230, 57, 70` | Blood red |

### Typography
| Element | Font | Weight | Size | Style |
|---------|------|--------|------|-------|
| Body / UI | Geist Sans (`--font-geist-sans`) | 400 | 14-16px | Normal |
| Labels | Geist Sans | 400-500 | 10-12px | Uppercase, tracked |
| Results score label | Playfair Display (`--font-playfair`) | 700 | 3xl-4xl | Bold italic |

### Visual Effects
- **Grain overlay**: CSS `repeating-conic-gradient` on `.grain-bg::before`, `mix-blend-mode: overlay`, very subtle (0.008/0.005 opacity)
- **Card animations**: flip-in, glow, bob, wave, placeholder-appear
- **Connector sway**: SVG bezier with `string-sway` animation
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` kills all animations/transitions

## Component Specs

### Chain Cards
| Variant | Height | Aspect | Notes |
|---------|--------|--------|-------|
| Start/End (bookend) | `30dvh` → shrinks to `20dvh` min | 3:4 | Shrinks 3dvh per chain link added |
| Intermediate (actor/media) | 70% of bookend height, min `14dvh` | 3:4 | Gentle bob animation |
| Placeholder | Same as intermediate | 3:4 | Dashed border, icon-based |

### Animations
- Card flip-in (400ms), card glow (800ms), card bob (3-4s), card wave (500ms)
- String sway on connectors (3-4s)
- Placeholder appear (300ms)
- Fade-in-up (400ms)

### Sound Effects (`lib/sounds.ts`)
All synthesized via Web Audio API — no audio files needed.
| Sound | Trigger | Description |
|-------|---------|-------------|
| `playCardSound()` | Valid media/person selected | Ascending sine chime (660→880Hz, 250ms) |
| `playRemoveSound()` | Undo or reset | Descending triangle thud (400→180Hz) + noise burst |
| `playWinSound()` | Target tapped (chain closes) | C major arpeggio (C5-E5-G5-C6, 120ms spacing) |
| `playFlipSound()` | Card flip during reveal | Bandpass-filtered noise burst + sine undertone (~300ms) |

### Reveal Screen (`RevealScreen.tsx`)
- **Purpose**: Replaces dead "Finding pair..." wait with cinematic card-flip reveal
- **Phase machine**: `"loading" → "flip-left" → "flip-right" → "title" → "slide-out"`
- **Layout mirrors ChainBuilder**: same header position (`pt-6 md:pt-12`), same flex spacers (`flex-[0.3] md:flex-[0.8]`), same bottom padding (`pb-24 md:pb-0`, `mb-20 md:mb-2`) — so cards end up in the same position as PlayingScreen
- **Card sizing**: `min(42dvh, 50vw)` centered → shrinks to `30dvh` during slide-out (matches bookend height)
- **3D card flip**: CSS `transform-style: preserve-3d` + `backface-visibility: hidden` + `rotateY(180deg)`
- **Slide-to-edges**: `useLayoutEffect` calculates `translateX` deltas based on POST-SHRINK flex positions so cards land at `px-3 md:px-8` from edges (matching PlayingScreen exactly)
- **Timeline**: +500ms flip-left, +1500ms flip-right, +2500ms title, +4500ms slide-out, +5400ms dispatch START_GAME
- **Image preloading**: `new Image()` with `onload` callbacks before triggering flips
- **Share links use the reveal too**: `/play?pair=id-id` → `presetPuzzle` (already verified) → same timeline

### Mobile Responsiveness
- **Target**: 390px+ (iPhone 14 and up)
- **Approach**: Mobile-first CSS, `md:` breakpoint (768px) for desktop
- **Search bar**: Fixed to bottom of screen on mobile (`fixed bottom-0 z-40`), inline under placeholder on desktop
- **Search results**: Open upward on mobile (`bottom-full`), downward on desktop
- **Chain**: Horizontal scroll preserved, right-edge gradient fade as scroll hint on mobile
- **Safe area**: `pb-[env(safe-area-inset-bottom,12px)]` on sticky search bar for iPhone home indicator
- **Viewport**: `maximumScale: 1, userScalable: false` to prevent iOS auto-zoom on input focus
- **Touch targets**: Undo button `w-8 h-8` on mobile (vs `w-6 h-6` desktop)
- **Reduced motion**: `prefers-reduced-motion: reduce` kills all animation/transition durations

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
- [ ] Update accent color on difficulty selection (not just on game start)
- [ ] Increase `--color-text-secondary` to `#8A8A8A`+ for WCAG AA contrast
- [ ] Add error/invalid sound for failed validation
- [ ] Reduce bob/sway animations during active play

### Lower Priority (features + delight)
- [ ] Async competitive mode (challenge a friend with same pair)
- [ ] Daily puzzle (seed-based pair generation — stub exists in `getPairForDate`)
- [ ] Themed actor pools (horror, comedy, etc.)
- [ ] Lightweight auth (Google/GitHub) for stats + leaderboards
- [x] Optimal-path comparison on results (2026-09-25, plain lists; styling in the design pass)
- [ ] Step counter during gameplay
- [ ] Onboarding for first-time players
- [ ] Hover states on chain cards (show full name, year)

## Session End
Before ending any session:
1. Update the "Current State" section below
2. Note exact file paths that were modified
3. If any features are partially complete, describe what's left

## Current State
_Updated by Claude — 2026-09-25 (Session 6, relaunch step 3: core loop v2)_
- **Branch `core-loop-v2`, NOT merged or deployed.** Production (https://six-degrees-topaz.vercel.app) still runs session 5. Merge to `main` auto-deploys; then `npm run smoke -- https://six-degrees-topaz.vercel.app`.
- **Verified locally:** `npm test` 54/54, `npm run lint` 0 errors (11 warnings), `npm run build` clean, `npm run smoke -- http://localhost:3100` 19/19. Every build item played in Playwright at 375 and 1440 (Easy + Medium; wins, give-ups, hints, share links, Play Again).
- **This session (commits `7da0df8`…):** spec + plan in `docs/superpowers/`; costar graph + solver (`lib/solver/`, `scripts/build-graph.ts`, `data/costar-graph.json`); `/api/puzzle`, `/api/route`, `/api/tmdb/filmography`; verify-pair deleted; par in state; par-relative scoring + paused clock + Wordle shake on rejected picks; stuck exits (reset clock, hint ladder, show me a route); tap-to-close win moment (`lib/motion.ts`); results route comparison + share line; fair-puzzle floor; exact-match search ranking; Play Again through the reveal.
- **Open for Marco:** confirm motion values (`lib/motion.ts`); rules call on animated-TV voice cameos; merge + deploy. Details in `NEXT.md`.
- **Research used:** `~/Obsidian/marcowits/resources/research/2026-09-25-daily-web-game-patterns.md` (Wordle/Connections/Strands timings, share formats).

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
