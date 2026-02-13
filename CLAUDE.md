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
components/
  Game.tsx                      # State-driven screen switcher + difficulty-based accent color
  screens/
    HomeScreen.tsx              # Landing — branding + difficulty picker + play button
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
  sounds.ts                     # Web Audio API synthesized sounds (card chime, win arpeggio, undo crumple)
  game-reducer.ts               # useReducer: all game state transitions
  GameContext.tsx                # React Context provider
  tmdb.ts                       # Client-side fetch helpers (search, validate, verifyPair)
hooks/
  useDebounce.ts                # 300ms debounce for search
VIRALITY-RESEARCH.md            # Game monetization + virality research (Wordle case study, growth playbook)
UI-CRITIQUE.md                  # Comprehensive UI/UX critique with prioritized fixes
```

## Game Flow
```
Home (pick difficulty) → Playing (random pair, live timer) → Results (chain + score + share) → Play Again
```

## State Shape
```typescript
{
  phase: "home" | "playing" | "results",
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
| `--color-error` | `#E63946` | Error messages |
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
| Body / UI | Geist Sans (`--font-geist-sans`) | 600 (global semibold) | 14-16px | Normal |
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
- [ ] Sharing via URL route handler (`/play?pair=id-id` — URL is generated but no route exists)
- [ ] Fix error color collision with hard-mode accent (both `#E63946`)
- [ ] Add network error handling in validation (unhandled promise rejections)
- [ ] Add clipboard copy confirmation on share
- [ ] Remove global `font-semibold` from body (kills typographic hierarchy)
- [ ] Add keyboard navigation to search results (arrow keys, Enter, Escape)

### Medium Priority (polish)
- [ ] Update accent color on difficulty selection (not just on game start)
- [ ] Increase `--color-text-secondary` to `#8A8A8A`+ for WCAG AA contrast
- [ ] Add screen transitions between phases (crossfade or card-fan-out)
- [ ] Reduce bob/sway animations during active play
- [ ] Add error/invalid sound for failed validation
- [ ] Strengthen search result hover state (currently nearly invisible)

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
_Updated by Claude — 2026-02-10_
- **Last worked on:** Dark A24 theme migration, sound effects, mobile responsiveness, UI critique
- **This session completed:**
  - Dark A24 palette (from Valentine's project) applied to all CSS variables
  - Playfair Display font added for results score label
  - Difficulty-based dynamic accent colors (green/coral/red) via Game.tsx useEffect
  - CSS grain texture overlay restored
  - Web Audio API sound effects (card chime, win arpeggio, undo crumple)
  - Full mobile responsiveness pass (sticky search bar, responsive spacing, scroll hints, touch targets, reduced-motion, viewport meta)
  - Comprehensive UI/UX critique generated (UI-CRITIQUE.md)
  - Game virality/monetization research (VIRALITY-RESEARCH.md)
- **Modified files:** `app/globals.css`, `app/layout.tsx`, `components/Game.tsx`, `components/screens/HomeScreen.tsx`, `components/screens/ResultsScreen.tsx`, `components/round/ChainBuilder.tsx`, `components/round/ChainDisplay.tsx`, `components/round/ChainCard.tsx`, `components/round/SearchResults.tsx`
- **New files:** `lib/sounds.ts`, `VIRALITY-RESEARCH.md`, `UI-CRITIQUE.md`
- **Build status:** Dev server runs on port 3005
- **Known issues:** Error color (`#E63946`) identical to hard-mode accent. Global `font-semibold` flattens typography hierarchy. `--color-text-secondary` fails WCAG AA contrast. Share URL points to nonexistent route.
- **Next priorities:** Share route handler (`/play?pair=id-id`), then UI critique priority fixes
