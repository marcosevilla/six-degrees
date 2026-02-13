# Six Degrees -- Comprehensive UI Critique

## 1. Visual Design

### Color Palette

The dark theme (`#0A0A0A` background, `#141414` surface, `#222222` borders) is clean and creates good cinematic atmosphere. The difficulty-based accent system in `components/Game.tsx` (lines 10-14) is smart -- green for easy, coral for medium, red for hard -- but there is a problem: the accent color only applies _after_ the player starts the game. On the home screen, the accent defaults to `#E63946` (the hard color) regardless of what difficulty is selected. This means switching between Easy/Medium/Hard on the home screen changes nothing visually except which button is filled. The accent should update on selection, not just on game start, so the player gets immediate visual feedback that the difficulty "theme" has shifted.

The `--color-error` (`#E63946`) is identical to the hard-mode accent _and_ the default accent. This means on hard mode, error states are visually indistinguishable from the accent color. An error message in `ChainBuilder.tsx` (line 159, `color: var(--color-error)`) will look like a normal accent-colored label. This is a real usability problem.

The success green (`#4ade80`) is defined in CSS (line 22 of `globals.css`) but is never actually used anywhere in the UI.

### Typography

The body is set to `font-semibold` globally in `layout.tsx` (line 26). Every single piece of text in the app inherits `font-weight: 600`. This kills the typographic hierarchy -- labels, body text, headings, and secondary text all share the same weight. The `font-semibold` on body should be removed. Let individual components declare their weight. Right now the uppercase labels at 10-12px in `font-semibold` feel heavy and shouty, while the heading at `text-5xl font-bold` barely separates from surrounding text because everything is already semibold.

Playfair Display is loaded but only used in one place: the score label on the results screen. Loading an entire font family for one word is a performance tradeoff worth questioning. Consider whether the existing sans-serif at a larger size with different styling (lighter weight, italic) could achieve the same impact.

The name labels on chain cards (`ChainCard.tsx` line 132) are truncated at `max-w-[120px]`. For longer names like "Samuel L. Jackson" this creates inconsistent presentation. The truncation width should be relative to the card width, not a fixed pixel value.

### Grain Texture Overlay

The grain overlay uses extremely subtle opacity values (0.008 and 0.005). At these values, the grain is essentially invisible on most displays. Either make it visible enough to matter (bump to 0.02-0.03 range) or remove it.

### Card Design

The border treatment is barely visible: `1px solid rgba(255, 255, 255, 0.08)` on a dark background is almost imperceptible. When an actor has no profile photo, you get an invisible card (same `#141414` surface on `#0A0A0A` background). The fallback state needs stronger visual treatment -- perhaps a gradient, a silhouette icon, or a more visible border.

The placeholder card icons (FilmIcon, PersonIcon) at 20x20px are small inside cards that can be 14-30dvh tall. They feel lost in the space.

### Overall Aesthetic Coherence

This reads as a well-structured prototype, not a polished product. The bones are excellent -- the layout structure, the card chain concept, the horizontal scroll interaction. But everything is rectangles with barely-visible borders on a flat dark background. There are no rounded corners anywhere except the "Start over" pill button and search result avatars. The buttons on the home screen and results screen are sharp rectangles with no border-radius, which feels harsh against the organic bezier connectors in the chain.

---

## 2. Usability & UX

### Game Flow Clarity

The three phases (home -> playing -> results) are clean but the transitions are instant -- there is no animation between screens. The player goes from a centered home screen to a full-screen chain builder with no transitional moment.

### Search Input Discoverability

The search input is positioned dynamically under the placeholder card. There is no visual anchor telling the player "type here." On first load, the search bar appears at whatever x-position the placeholder happens to be, with no label, no magnifying glass icon, just an underlined text input.

The placeholder text ("What was [Actor] in?" / "Who else was in [Movie]?") does the heavy lifting of communicating what to do next.

### Chain Building Interaction

There is no visual indicator of what search mode you are in beyond the placeholder text. If the player clears the input and forgets what they were doing, they have to re-read the placeholder. A small label above the input ("Search for a movie" / "Search for an actor") would help.

The "Checking..." text is tiny (10px uppercase), positioned below the search input, and styled in secondary color. It is easy to miss.

### Error Messaging

- The error color `--color-error` is identical to the hard-mode accent. On hard mode, errors look like accent-colored labels.
- There is no error state for network failures. If `validateConnection` fails, the `isValidating` state gets stuck at `true` permanently.

### Difficulty Selection

When "Easy" is selected, the button shows as red-filled (the default accent), not green. The accent color does not update until `START_GAME` is dispatched. This is inconsistent with the difficulty-color mapping.

### Timer

The timer is de-emphasized to the point of being ignorable (`text-sm` in secondary color). For a game that tracks time as a scoring metric, this may be intentionally low-pressure but the player should have some awareness of it.

### Undo/Reset

- **Undo**: The X button is 24x24px, below Apple's 44px minimum touch target.
- **Reset**: No confirmation dialog -- tapping "Start over" immediately resets the entire chain. For a chain that took several minutes to build, this is destructive with no safety net.
- No way to undo multiple steps without repeated tapping.

### Results Screen

The score labels ("Incredible!", "Amazing!", etc.) only key off step count, not time. A player who takes 45 minutes gets the same label as one who takes 30 seconds.

### Share Flow

- No visual confirmation that text was copied to clipboard.
- The share URL (`/play?pair=123-456`) points to a route that does not exist.
- The share text uses an emoji which feels inconsistent with the minimal A24 aesthetic.

---

## 3. Information Architecture

### Missing Information

1. **No instructions or onboarding.** A first-time player never learns the alternating movie-actor pattern.
2. **No "how to play" accessible during gameplay.**
3. **No step counter during gameplay.** The player can count cards but there is no explicit indicator.

### Home Screen Goal Clarity

The difficulty descriptions ("They share a movie" / "One actor apart" / "No obvious connection") leak implementation details a new player won't understand. "One actor apart" means nothing before you have played.

### Chain Progress

A dimmed/ghosted connector from the placeholder to the pinned end card would communicate "you need to get from here to there" more effectively.

---

## 4. Interaction Design

### Sound Effects

**Well-designed sounds**, but missing:
- No sound on game start
- No error/invalid sound when a connection fails
- No sound on share/play-again actions

### Animation System

The bob + sway running simultaneously on every card creates visual noise during the core interaction moment. Consider only bobbing when the player is idle or reducing to recent cards only.

### Missing Micro-interactions

1. No hover states on chain cards (could show full name, year)
2. No focus indicators on buttons (tab navigation is invisible)
3. No loading skeleton for initial pool fetch
4. No transition animation between screens
5. Search result hover (`bg-white/[0.03]`) is practically invisible -- needs stronger feedback

### Feedback Loops

- After picking a media item, the mode switch is instant and can feel disorienting
- "Checking..." has no timeout -- if the API hangs, the player waits forever
- After winning, the screen instantly switches to results -- the player misses seeing their completed chain in context

---

## 5. Creative Suggestions

### Premium Features
1. **Animated screen transitions** -- crossfade or card-fan-out between phases
2. **Daily challenge mode** (`getPairForDate` stub exists)
3. **Optimal path comparison** -- "You connected them in 4 steps. The shortest path is 2."
4. **Actor portraits in the header** next to names
5. **Chain replay animation** on results screen

### Inspiration From Other Games
- **Wordle**: Par system -- easy par is 1, medium par is 2, hard par is 3+
- **Connections**: Color-code chain links by how "popular" each choice was
- **Immaculate Grid**: Rarity score -- "Only 3% of players used this movie"

### Share Screen Improvements
- Shareable emoji grid (like Wordle) representing the chain
- Visual strip of the player's path in the share card
- Compact visual format with difficulty + steps + time

### Delight Moments
- Subtle confetti on win (matching A24 aesthetic)
- Richer win sound with reverb tail
- Progressive difficulty suggestion: "That was fast! Try Hard mode next time?"

---

## 6. Accessibility Concerns

### Color Contrast

**Critical failure:** `--color-text-secondary` (`#666666`) on `--color-bg` (`#0A0A0A`) has approximately 3.9:1 contrast ratio. WCAG AA requires 4.5:1 for normal text. Every label, description, timer, and difficulty indicator uses this color.

**Recommendation:** Bump to at least `#8A8A8A` (~4.5:1) or `#999999` (5.3:1).

### Touch Target Sizes
- Undo button: 24x24px (needs 44px minimum)
- Difficulty buttons: ~32px tall (needs 44px)
- "Start over" button: ~28px tall (far too small)

### Screen Reader Concerns
- Chain display has no semantic structure (no `role`, `aria-label`)
- Search results dropdown has no `role="listbox"` or keyboard navigation
- Game phase changes are not announced (no `aria-live` regions)
- Difficulty selector has no `role="radiogroup"` or `aria-checked`

### Keyboard Navigation
- Search results have no arrow key navigation, Enter to select, or Escape to close
- No keyboard shortcut for undo (Ctrl+Z / Cmd+Z)
- Focus is not managed between screens

---

## Priority Fixes

**High priority (usability):**
1. Fix error color collision with hard-mode accent
2. Add network error handling in validation (unhandled promise rejections)
3. Fix broken share URL (points to nonexistent `/play` route)
4. Add clipboard copy confirmation
5. Remove global `font-semibold` from body
6. Add keyboard navigation to search results

**Medium priority (polish):**
7. Update accent color on difficulty selection, not just game start
8. Increase `--color-text-secondary` to `#8A8A8A`+ for WCAG AA
9. Increase touch targets on undo and "Start over" buttons
10. Add screen transitions between phases
11. Reduce bob/sway during active play
12. Add error/invalid sound for failed validation

**Lower priority (delight):**
13. Add hover states to chain cards
14. Strengthen search result hover state
15. Add onboarding for first-time players
16. Optimal-path comparison on results
17. Add step counter during gameplay
