# Design & UX Audit — 2026-08-09

Synthesis of a three-lens audit (game design principles, Josh Puckett design-critique methodology, better-ui/better-typography craft checklists) plus a live playthrough on desktop (1600×900) and mobile (375×812). Items already fixed in previous sessions (share URL, error color, keyboard nav, clipboard flash, etc.) are excluded.

**Severity order: Structural (what the game is) → Behavioral (how it feels) → Visual (how it looks).**

---

## Context

A public, free actor-connection game with an A24-inspired dark aesthetic. Emotional context: casual, playful, trivia-brag energy — the player is testing film knowledge and wants a braggable artifact at the end. Comparison bar carried by users: Wordle (share/daily), Framed/Cine2Nerdle (movie trivia), NYT games polish.

## First Impressions

The bones are strong: the placeholder-as-question prompt ("What was Harrison Ford in?") is quietly excellent game writing, the reveal screen gives the pair draw real slot-machine drama, and per-link feedback (flip + chime) lands. But the game currently spends its emotional budget in the wrong places — a 5.4-second cinematic for the *setup* and a hard instant cut for the *win* — and the scoreboard (time-based) measures typing speed more than film knowledge. Visually, the dark restraint is right but under-executed: the most meaning-rich element (the connector) has the least visual weight on the page, three of the audit's worst contrast failures are on the primary CTA, and the mobile results screen has cards physically overlapping.

---

## Part 1 — Structural (game design)

### 1.1 The validate endpoint never got the talk-show fix ⚠️ integrity hole
`app/api/tmdb/validate/route.ts:35-37` checks raw cast with no `isActingRole` filter, while `verify-pair/route.ts:24-39` filters talk/news/reality/archive. **Any pair — including Hard — can be connected in 1 step via "Jimmy Kimmel Live" or an awards show.** Difficulty classification and gameplay use two different rulebooks. Fix: extract the filter into a shared helper, apply to both endpoints. (Quick, high-impact, and the same trap CLAUDE.md already warns about.)

### 1.2 The win is an anticlimax
`game-reducer.ts:60-83`: the game only ends when the player *searches for and selects* the target's name — a name printed on screen the whole game. The final beat is data entry. Then `SELECT_PERSON` sets `phase:"results"` synchronously — a hard cut before the player sees the circuit close. Meanwhile the *setup* got a 5.4s cinematic. The animation budget is inverted.
**Recommendation:** when the last selected movie contains the target, make the target card itself tappable/pulsing ("tap to complete the chain") — or auto-complete — then play the close-the-circuit moment (final connector draws in, wave, arpeggio) *in the playing view*, and only then transition to results.

### 1.3 Time-based scoring fights the game's nature
This is a recall game; time pressure produces tip-of-the-tongue blocking, and the timer runs during network validation and searches (`ChainBuilder.tsx:24-31`), so "2:36" partly measures API latency and typing. It also makes scores incomparable between players. Wordle's insight was *removing* time from a knowledge game.
**Recommendation:** demote time to a small tiebreaker stat; make **steps vs. par** the score. `verify-pair` already computes `minSteps` and throws it away — carry it through `START_GAME` into state, show "You: 3 · Best possible: 2" on results. This is the single cheapest high-leverage change in the codebase.

### 1.4 The BFS pathfinder is the keystone, not a bug fix
Reframe the backlog item. A real shortest-path solver with caching enables: trustworthy par (1.3), honest Hard mode (kills the silent unverified fallback), hints (1.5), and the "optimal path" recap. Four backlog features are blocked on this one piece of infrastructure.

### 1.5 There is no way out of being stuck
No give-up, no hints, no lose state. A stuck player's only exit is closing the tab — invisible churn. "Start over" resets the chain but **not the timer** (`game-reducer.ts:118-124`), so restarting guarantees a bad score — one frustration converted into two.
**Recommendation:** (a) reset `startTime` on reset; (b) add a hint economy — "show this actor's top 5 movies" (one credits call) at a step-penalty cost; (c) a "reveal a path" give-up that ends the round gracefully (needs BFS).

### 1.6 The silent fallback breaks the difficulty promise
After 8 failed attempts, RevealScreen starts an unverified pair still wearing the requested difficulty label (`RevealScreen.tsx:55`). Difficulty selection is a promise; the game silently breaks it. Until BFS lands, at minimum relabel the fallback round honestly ("Wildcard pair").

### 1.7 Retention loop is missing three of four stages
Variable reward exists (the pair draw is genuinely good). Missing: trigger (no daily puzzle — `getPairForDate` is a stub), investment (zero persistence: no stats, streaks, or personal bests), and a share artifact worth posting. The share text shows the cost ("2 steps") without the intrigue. **Recommendation:** daily seeded pair + archive; localStorage stats/streak; spoiler-safe share grid, e.g. `Six Degrees #142 · Par 2 · ✅+1 · 🧑—🎬—🧑—🎬—🎯` — par-relative, self-explanatory, no answers leaked. The existing challenge-link rematch is a real strength — keep it.

### 1.8 Smaller structural fixes
- "Play Again" runs up to 5 sequential verifyPair calls with **zero loading feedback** (`ResultsScreen.tsx:44-67`) — button feels dead; also duplicates RevealScreen's pair-finding with different retry counts (5 vs 8). Route Play Again back through the reveal (it exists for exactly this).
- TV eligibility is undiscoverable (copy says "movies"; TV counts).
- No example chain anywhere — one illustrated `Actor → Movie → Actor` line on the home screen would preempt the biggest mental-model gaps for near-zero cost (Wordle's onboarding is exactly this).

---

## Part 2 — The string metaphor (verdict: right instinct, wrong execution)

The swaying bezier connector (`ChainCard.tsx:142-166`) is **decoration, not communication**:
- It doesn't attach to the cards — a fixed 28×40 squiggle floating in the flex gap. Strings read as "connection" when they bear tension and terminate at anchors.
- The sway animation contradicts the meaning: a validated link is *locked in*; sway says *loose*.
- Its one informative state (dashed-pending vs. accent-confirmed) is carried by a 1px stroke — the most information-rich element on screen has the least visual weight.
- The connector is where the relationship *lives* ("both were in Air Force One") yet carries zero data.

**Recommendation — synthesis rather than replacement:**
1. Keep photo cards in play (recognition + charm).
2. Steal from the conspiracy-board metaphor: anchor the string to card edges, snap it **taut** with a subtle twang on validation, and let the final string closing the circuit BE the win moment.
3. Use a **subway-map abstraction** (actors = stations, movies = line segments) for the results recap and share image — it makes "steps" spatially literal, supports a "your route vs. express route (par)" overlay, and compresses perfectly for sharing.

Alternatives considered: full film-strip chain (great A24 fit, but uniform frames fight the card hierarchy and shrink mechanic); full conspiracy board (best emotional fit, but irregular pinning fights horizontal scroll and mobile).

---

## Part 3 — Behavioral / interface design

### 3.1 Results screen doesn't close the loop (desktop) and breaks (mobile)
- Desktop: the completed chain renders with the target still pinned at the far-right edge — Batman Begins, a huge void, then Cillian Murphy with an orphan connector. The chain never visually *connects* on the one screen whose job is to celebrate the connection.
- Mobile (375px): chain cards **overlap** — the Air Force One card renders clipped and slides *under* the target bookend; middle links are cut off. This is the single worst screen in the product right now.
- Fix: on results, collapse the bookend layout — lay the full chain out as one connected sequence (wrap to two rows on mobile, or use the subway-map recap).

### 3.2 Mobile playing screen loses the spatial premise
At 375px the start and target bookends render flush against each other (shared hard edge, no gap, no visible placeholder on first paint). The core spatial metaphor — "two people far apart; fill the space between" — doesn't survive the breakpoint. Fix: keep a visible gap + dashed placeholder + connector stub between bookends at all widths; let the bookends shrink further.

### 3.3 Focus, selection, and touch details (observed live)
- Tapping PLAY on mobile emulation *text-selected the label* instead of activating — button labels need `select-none`; there's no `::selection` styling anywhere, so highlights render browser-default blue against the A24 dark.
- Zero `focus-visible` styles in the codebase; `SearchInput` sets `outline-none`. Keyboard players get browser defaults at best.
- Hit areas under 44px: undo (32px mobile / 24px desktop), difficulty buttons (~32px), Start over (~28px).
- No `role="radiogroup"`/`aria-checked` on difficulty; no `aria-live` announcements for validation results or phase changes.
- `maximumScale:1, userScalable:false` in `layout.tsx` blocks pinch zoom (WCAG 1.4.4 failure) and is redundant — the input is already 16px.

### 3.4 Search dropdown clips at the desktop viewport bottom
With the chain one link deep, the input sits low enough that result rows render past the fold (second result was half-cut at 900px height). Cap the dropdown height / flip upward when space is short (mobile already opens upward).

### 3.5 Feedback gaps
- Invalid picks get a small text line only — no shake, no error sound (backlog item confirmed worth doing). Errors currently read as form validation, not gameplay.
- "Checking…" during validation is a 10px caption; the input just freezes. Consider optimistic card placement with rollback, or at least a visible pending state on the placeholder card itself.
- Reset ("Start over") is destructive with no confirmation.

---

## Part 4 — Visual polish (recommended changes)

Marco: exact replacement values below are directional, not specs — final colors/weights are your call.

#### Contrast (worst first)
| Before | After |
| --- | --- |
| White CTA text on accent bg: 1.74:1 on easy green, 3.51:1 medium, 4.17:1 hard (`HomeScreen.tsx:96`, `ResultsScreen.tsx:140`) | Dark text (`#0A0A0A`) on accent buttons, or darken accents for button fills — every difficulty currently fails AA |
| `--color-text-secondary: #666666` — 3.44:1 on bg, 3.2:1 on surface | ≥ `#8A8A8A` (known backlog item; fails on every label in the app) |

#### Typography
| Before | After |
| --- | --- |
| Results numbers lack `tabular-nums` (`ResultsScreen.tsx:91,109`) | Add `tabular-nums` (timer already has it) |
| No `leading-*` on any heading; defaults shift across breakpoints | `leading-[1.1]`-ish on display text (`HomeScreen.tsx:49`, `ChainBuilder.tsx:147`, `RevealScreen.tsx:178`, `ResultsScreen.tsx:81`) |
| `tracking-tight` only on the home title | Add negative tracking to the other three display headings |
| `text-[10px]` repeated 4× as an arbitrary value | Define a `--text-2xs` token in the `@theme` block |
| No `text-balance`/`text-pretty` anywhere | `balance` on the pair headline (long names wrap awkwardly), `pretty` on the home description |
| "ANDREW GARFIE…" fixed-width truncation on cards | Allow two-line wrap on bookend names, or full name on hover/tap |

#### Motion
| Before | After |
| --- | --- |
| Continuous bob + sway on every card during play | Kill ambient motion in active play (backlog confirmed); motion should be information — spend it on validate/win events |
| Undo/reset unmounts cards instantly; enters animate | Add a soft exit (small translateY + fade) — exits softer than enters, but present |
| `reveal-exit` 500ms vs 400ms enter | Exit ≤ enter duration |
| `transition-all` ×6 (`HomeScreen.tsx:69,93`, `SearchInput.tsx:136`, `ResultsScreen.tsx:137,147`, `ChainCard.tsx:92`) | Scope to the actual properties |
| Card shrink animates `height` (layout thrash) (`ChainCard.tsx:48`, `RevealScreen.tsx:281`) | Animate `transform: scale` |
| `card-glow` animates full-opacity `box-shadow` | rgba accent at low alpha, matching the softer treatment in `ChainCard.tsx:90` |

#### Surfaces & details
| Before | After |
| --- | --- |
| Search-result posters/avatars have no outline (`SearchResults.tsx:71-75,110-115`) | 1px `rgba(255,255,255,0.08)` like the chain cards |
| Difficulty + Start-over buttons have no press feedback; siblings do | `active:scale-[0.96]` everywhere or nowhere |
| `rounded-t-lg` on the dropdown is the app's only 8px radius | Fold into a deliberate radius scale (cards are square — fine, but make it a decision) |
| Grain overlay at 0.008/0.005 opacity | Effectively invisible — either raise until perceptible or delete the code |
| Playfair Display loaded for one word ("Amazing!") | Either expand serif usage into an intentional display voice (title? score label + pair names?) or drop the second font |
| Share text leads with 🎬 emoji | Inconsistent with the minimal A24 voice — decide deliberately (the share grid redesign supersedes this) |

---

## What's working — protect these
- Placeholder-as-question prompts ("Who else was in X?") — best-in-class implicit teaching; invisible state machine.
- Difficulty descriptions doubling as rules copy.
- The reveal's slot-machine framing of the pair draw (the game's strongest hook asset).
- Per-link juice: flip + glow + chime, auto-scroll.
- Clean reducer — no invalid states reachable; undo restores search mode correctly.
- Challenge-link rematch in the share flow (better than Wordle in this one dimension).
- Card-shrink as nonverbal "long chain = worse" signal.

---

## Top Opportunities (ranked)

1. **Build the BFS pathfinder and switch to par-based scoring; demote the timer.** Unblocks honest Hard mode, hints, optimal-path recap, and a comparable/braggable score in one move.
2. **Apply the acting-role filter to `validate`** so gameplay and classification share one rulebook — closes the talk-show exploit that currently defeats every difficulty. (Small diff; do first.)
3. **Redesign the win moment**: tappable target to complete the chain, circuit-close animation in the playing view, then results. Move animation budget from setup to payoff.
4. **Fix the results-screen chain layout** — desktop void, mobile card overlap — and make the completed chain read as one connected object.
5. **Ship the daily puzzle + spoiler-safe share grid** (par-relative emoji chain) + lightweight localStorage streak/stats — the entire missing retention loop.
6. **Accessibility/contrast batch**: CTA text contrast, `#8A8A8A` secondary, focus-visible styles, `select-none` + styled `::selection`, 44px hit targets, remove `maximumScale`, radiogroup/aria-live.
7. **Make the string mean something**: anchored, taut-on-validate connectors in play; subway-map recap for results/share; kill ambient sway.
