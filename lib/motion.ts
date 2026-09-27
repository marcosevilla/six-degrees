// Every motion and physics value in the game, so they can be retuned together.
// Reel Line values approved 2026-09-27 (NEXT.md). Nothing moves unless the
// player did something: there is no idle motion anywhere.

// Film strips are verlet ropes pinned to reel hubs.
export const FILM_PHYSICS = {
  gravity: 2200, // px/s²
  damping: 0.985, // velocity kept per step
  iterations: 14, // constraint passes per step
  points: 18, // points per strip
  slack: 1.1, // strip length ÷ hub-to-hub distance, at rest
  closeSlack: 1.01, // pulled taut when the chain closes
  relaxSlack: 1.078, // after the taut beat (rest slack × 0.98)
  danglingLength: 120, // px, a picked film before it's clipped on
  stepS: 1 / 120, // fixed simulation step
  stepsPerFrame: 2,
  settleSpeed: 0.04, // px per step; below this a strip counts as still
  calmFrames: 40, // still frames before the sim stops
} as const;

export const REEL_MOTION = {
  clipOnMs: 280, // the free end swings over and clips onto a reel
  clipLiftPx: 40, // how high the free end arcs on its way over
  reelClickMs: 320, // the target's reel clicks a sixth of a turn
  reelClickEasing: "cubic-bezier(0.2, 0.8, 0.2, 1.25)", // slight overshoot
  clickToTautMs: 420, // beat between the click starting and the pull
  tautMs: 380, // every strip pulls taut, then relaxes
  settleMs: 900, // beat on the finished line before results
  readyPulseMs: 1200, // "tap to connect" ring on the target
  resultsSlideMs: 300, // results slide up
  resultsEasing: "cubic-bezier(0.2, 0, 0, 1)",
  shakeMs: 600, // wrong pick (Wordle's row shake)
} as const;

// Tap to results.
export function closeBeatMs(): number {
  return REEL_MOTION.clipOnMs + REEL_MOTION.clickToTautMs + REEL_MOTION.tautMs + REEL_MOTION.settleMs;
}

// Legacy card-chain win timings. Removed when the reels replace the cards.
export const WIN_MOTION = {
  targetPulseMs: 1200,
  connectorDrawMs: 450,
  bounceMs: 1000,
  bounceStaggerMs: 100,
} as const;

export function bounceDelayMs(index: number): number {
  return WIN_MOTION.connectorDrawMs + index * WIN_MOTION.bounceStaggerMs;
}
