# Six Degrees — Project Context

## Overview
A public actor-connection game. Given two random actors, build a chain of movies and co-stars to connect them in the fewest steps and shortest time. Forked from the Valentine's "Scream Queens: Six Degrees" project — stripped of all personal content and rebuilt with a generic game loop.

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
- **TMDb pool cache** — The actor pool is cached in server module scope (24h TTL). Restarting the dev server clears it. First request after restart is slow (~5-10s) while it fetches from TMDb.

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
    search/route.ts             # Search movies, TV, actors via TMDb
    credits/route.ts            # Get cast list for a movie/show
    validate/route.ts           # Validate actor↔movie connection
    pool/route.ts               # Dynamic actor pool (top 200 from TMDb, filtered)
    verify-pair/route.ts        # Verify pair connectability + difficulty classification
    person/route.ts             # Look up actor by TMDb ID (for share links)
  play/
    page.tsx                    # Share link landing page (/play?pair=id-id&d=difficulty)
components/
  Game.tsx                      # State-driven screen switcher + difficulty-based accent color + share-link auto-start
  screens/
    HomeScreen.tsx              # Landing — branding + difficulty picker + play button
    RevealScreen.tsx            # Card-reveal loading animation (pair finding + 3D card flip + slide to edges)
    PlayingScreen.tsx           # Wrapper for ChainBuilder
    ResultsScreen.tsx           # Score + completed chain + share + play again
  round/
    ChainBuilder.tsx            # Core gameplay: search + validate + chain + timer + sound effects
    ChainDisplay.tsx            # Horizontal scrollable card strip + scroll hint gradient
    ChainCard.tsx               # Individual card + connector + placeholder
    SearchInput.tsx             # Debounced autocomplete input
    SearchResults.tsx           # Dropdown result list (upward on mobile)
lib/
  types.ts                      # All TypeScript types (GameState, GameAction, Difficulty, etc.)
  actor-pool.ts                 # Dynamic pool fetch + client cache, random pair generation, image helpers
  scoring.ts                    # Score calculation + formatting + labels
  sounds.ts                     # Web Audio API synthesized sounds (card chime, win arpeggio, undo crumple, card flip whoosh)
  game-reducer.ts               # useReducer: all game state transitions
  GameContext.tsx                # React Context provider
  tmdb.ts                       # Client-side fetch helpers (search, validate, verifyPair, fetchPerson)
hooks/
  useDebounce.ts                # 300ms debounce for search
VIRALITY-RESEARCH.md            # Game monetization + virality research (Wordle case study, growth playbook)
UI-CRITIQUE.md                  # Comprehensive UI/UX critique with prioritized fixes
```

## Game Flow
```
Home (pick difficulty) → Reveal (card flip animation) → Playing (random pair, live timer) → Results (chain + score + share) → Play Again
```

## State Shape
```typescript
{
  phase: "home" | "revealing" | "playing" | "results",
  difficulty: "easy" | "medium" | "hard" | null,
  actorPair: { start: PoolActor, end: PoolActor } | null,
  chain: ChainLink[],
  searchMode: "media" | "person",
  selectedMedia: MediaResult | null,
  startTime: number | null,
  endTime: number | null,
}
```

## Actor Pool
- **Source**: TMDb `/person/popular` endpoint, fetched dynamically on app start
- **Size**: 200 actors
- **Filters**:
  - `known_for_department === "Acting"`
  - Must have a profile photo
  - At least 2 English-language `known_for` entries
  - At least 2 `known_for` entries with 3,000+ votes (mainstream productions)
- **Caching**: Server-side module cache (24h TTL) + client-side module cache (persists across renders)
- **Pool includes `profilePath`** from TMDb, so bookend cards show actor photos without extra API calls

## Difficulty System
Difficulty determines how connected the randomly selected pair is:

| Difficulty | Criteria | Optimal Solution |
|-----------|---------|-----------------|
| Easy | Actors share a movie | 1 step (Actor → Movie → Actor) |
| Medium | Actors share a co-star but no direct movie | 2 steps (Actor → Movie → Co-Star → Movie → Actor) |
| Hard | No connection found within 2 steps | 3+ steps |

- **Pair generation**: tries up to 8 random pairs, validates each via `/api/tmdb/verify-pair`, picks the first that matches the selected difficulty
- **Fallback**: if no matching pair found after 8 attempts, starts with whatever pair is available
- **Verify-pair endpoint**: fetches combined credits for both actors, checks for shared movies (1-step) and shared co-stars (2-step)

## Scoring
- **Steps** = number of movies used = `(chain.length - 1) / 2`
- **Time** = `endTime - startTime` (milliseconds)
- Labels: 1 step = "Incredible!", 2 = "Amazing!", 3 = "Nice!", 4+ = "You got it!"
- Live timer visible during gameplay (updates every second)

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
| `playWinSound()` | Target actor reached | C major arpeggio (C5-E5-G5-C6, 120ms spacing) |
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
- **Share links skip reveal**: `/play?pair=id-id&d=difficulty` dispatches `START_GAME` directly

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
- [ ] Make Hard mode reliable — still ~1 in 14 pairs, so it usually exhausts the 8 attempts and hits the silent unverified fallback. Needs BFS with caching.
- [ ] Add an `eslint.config.js` — eslint 10 is installed but linting never runs
- [ ] Update accent color on difficulty selection (not just on game start)
- [ ] Increase `--color-text-secondary` to `#8A8A8A`+ for WCAG AA contrast
- [ ] Add error/invalid sound for failed validation
- [ ] Reduce bob/sway animations during active play

### Lower Priority (features + delight)
- [ ] Async competitive mode (challenge a friend with same pair)
- [ ] Daily puzzle (seed-based pair generation — stub exists in `getPairForDate`)
- [ ] Themed actor pools (horror, comedy, etc.)
- [ ] Lightweight auth (Google/GitHub) for stats + leaderboards
- [ ] Optimal-path comparison on results ("You used 4 steps. The shortest path is 2.")
- [ ] Step counter during gameplay
- [ ] Onboarding for first-time players
- [ ] Hover states on chain cards (show full name, year)

## Session End
Before ending any session:
1. Update the "Current State" section below
2. Note exact file paths that were modified
3. If any features are partially complete, describe what's left

## Current State
_Updated by Claude — 2026-08-06 (Session 4)_
- **Last worked on:** Shipping the stalled reveal screen, then fixing the difficulty classifier
- **Live:** https://six-degrees-topaz.vercel.app — both commits deployed and verified in production
- **This session completed:**
  - Committed and shipped `RevealScreen` (`7c37b34`) — it had sat uncommitted since 2026-02-13 and was never deployed
  - Fixed the difficulty classifier (`61f138f`) in `app/api/tmdb/verify-pair/route.ts`
  - Added `.claude/launch.json` so the preview tool starts the dev server on port 3005
- **The classifier bug (worth understanding before touching credits again):** TMDb `combined_credits` includes talk shows, awards ceremonies, documentaries and archive-footage compilations. Nearly every famous actor has been on Kimmel, and *Final Cut: Ladies and Gentlemen* (2012) is stitched from clips of thousands of films and credits every actor in them. The shared-credit check therefore matched almost any pair and returned `minSteps: 1`, making Easy over-triggered and often unsolvable while Medium/Hard almost never matched. Fix filters to real acting roles (`character` containing "self"/"archive", genres 10763/10764/10767), keys credits on `media_type:id` (movie 2034 = Training Day collided with tv 2034 = Drive), and sorts by `vote_count` before sampling since `combined_credits` is roughly chronological.
- **Verified after the fix:** 14 random pool pairs → 4 easy / 9 medium / 1 hard (was effectively all-easy). Dinklage→Waltz 2 via Fassbender, Pugh→Blunt 1 via Oppenheimer, Stallone→Damon no longer a false easy. Played a full Easy round: Marsden→Urban, genuinely 1 step via *The Loft*.
- **Known trap:** if all 8 pair-finding attempts miss, `RevealScreen` starts an **unverified** pair still wearing the requested difficulty label. A wrong-looking difficulty in gameplay may be this fallback, not a classifier verdict — hit `/api/tmdb/verify-pair` directly before diagnosing.
- **Next priorities:** Hard mode is still rare (~1 in 14 pairs) so it often hits that silent fallback; a real fix needs BFS with caching. Then medium-priority polish (accent on difficulty select, WCAG contrast, error sound). ESLint 10 is installed but has no `eslint.config.js`, so linting never runs.

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
