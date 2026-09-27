# Reel Line critique (2026-09-27)

Interface Craft critique of the Phase 2 build (commits `b10fe30`…`00ab14b`), from Playwright screenshots at 375×812 and 1440×900. What's still weak, ranked at the end.

## Context
A casual, public movie-trivia game: two actors, connect them in as few films as you can. The emotional register is playful recall with a brag at the end. Losing costs nothing, but a stuck player should never feel stupid.

## First impressions
The metaphor finally carries meaning. A film strip is the connection, its color is the film, and taut means done. The close (clip-on, click, pull) is the best moment in the game now, and the results read as one object instead of two lists. What's weak is scale. The actor is the thing players recognize, but here they get a 30px face inside a 64px reel. On a phone with two reels, about 60% of the stage is empty ground. The line looks like a diagram of the game rather than the game.

## Visual design
- **Faces too small to recognize.** The hub photo is 30px, and at that size Jeffrey Wright and Robert Duvall are both "bald man". The old photo cards were the charm the audit said to protect. Bookend reels could scale with the stage (the results reel is 88px with a 42px hub, and that reads well).
- **Labels cut the film.** Name and film labels sit on opaque ground-colored plates, so a strip passing behind "Jeffrey Wright" is visibly chopped in two. This reads as a rendering bug, not a design choice. Options: let strips pass in front of name plates, give plates a 70% ground tint, or route labels off the strip.
- **The dangling film hides behind its own actor's name.** At 1440, *Avengers: Infinity War* hangs 120px, and the top ~40px sits behind the two-line "Robert Downey Jr." label. The moment of picking a film is the most important feedback on the stage, and half of it is covered.
- **Amber is doing two jobs.** It is film stock #2 and also the "tap to connect" / focus highlight. When the second film is amber and the target's ring is amber, the strip reads as already linked to the target.
- **The meta separator is cramped.** In "Medium ·Par 2", Overpass's middle dot sits tight against "Par". Use a thin space or a different separator.

## Interface design
- **Empty stage on phones.** With two reels, the target sits at y≈290 and 300px of ground sits under it, above the search. We're missing a chance to use that space to show distance: the gap is the game.
- **The top-films hint crowds the line.** Five 56px posters add ~110px to the bottom panel on phones and push the stage up by the same amount. It's a hint and it shouldn't cost the line its room. Use a single scrolling row of titles, or put the posters in a sheet.
- **Undo and Start over are anonymous icons.** Two 18px glyphs sit top-right, far from the chain they change. Start over still has no confirmation, and it also restarts the clock.
- **Pending is quiet.** The dashed amber ring and "Checking…" are static by design (no invented motion). Checks take ~250ms, so it mostly reads as a flicker. A slow reel turn would say "working" in the game's own language, but it needs a value from Marco.

## Consistency and conventions
- **Exits are still harder than enters.** On Undo, the film crumples and falls (good), but the removed reel just vanishes. Every reel arrives with a 280ms scale-in and none of them leaves.
- **The reveal doesn't land where play starts.** The cards flip in the middle of the screen, fade, and then reels appear top-left in a zigzag. Nothing carries across the cut. The old slide-to-edges at least pointed at the bookends.
- **Results strips have a fixed height.** Mini strips are 40px, and a three-line title (*The Lord of the Rings: The Fellowship of the Ring*) outgrows its own strip.

## User context
A stuck player on a phone now sees a calm, mostly empty line, a question in the search box, and two hint buttons. That's a good register: nothing nags. Uncommon care would be making the gap feel crossable: show how far apart the two actors are (par) as physical distance, and make each film visibly close it.

## Top opportunities
1. **Bigger faces.** Scale reels with the stage, with bookends at the results size (88/42), so recognition returns.
2. **Stop labels from chopping strips**, and hang a picked film below its actor's name instead of behind it.
3. **Use the phone's empty stage.** Size the zigzag gap to the available height so the line fills the screen, and move the top-films hint into a single row or a sheet.
4. **Give reels an exit** to match their entrance, and give the reveal a spatial handoff (cards shrink into the bookend reels).
5. **Split amber's two jobs.** Keep amber as the interaction highlight and start the film rotation on blue → red → green → amber, or give the ready ring its own treatment.
