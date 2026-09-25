// Win moment ("close the chain"). One place for every timing so they can be
// retuned together. Bounce values are Wordle's win bounce (1000ms, 100ms
// stagger, measured from its source); the rest are sized around it.
export const WIN_MOTION = {
  targetPulseMs: 1200, // "tap to close" pulse loop on the target card
  connectorDrawMs: 450, // the final connector draws in after the tap
  bounceMs: 1000, // each card's win bounce (Wordle)
  bounceStaggerMs: 100, // left-to-right delay between cards (Wordle)
  settleMs: 500, // beat on the finished chain before results
} as const;

// When each card starts bouncing: after the connector, left to right.
export function bounceDelayMs(index: number): number {
  return WIN_MOTION.connectorDrawMs + index * WIN_MOTION.bounceStaggerMs;
}

// Tap to results, for a chain of `cards` cards (target included).
export function closeBeatMs(cards: number): number {
  return bounceDelayMs(cards - 1) + WIN_MOTION.bounceMs + WIN_MOTION.settleMs;
}
