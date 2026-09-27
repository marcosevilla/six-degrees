import type { Point } from "./film-rope";

export interface StageLayout {
  points: Point[];
  width: number;
  height: number;
}

// Room kept under the lowest reel: its name, plus a picked film hanging from it.
const MOBILE_TOP = 52;
const MOBILE_BOTTOM = 150;
const MOBILE_GAP = { min: 140, max: 240 };
const DESK_MARGIN = 96;
const DESK_SPACING = { min: 180, max: 480 };

// Where each reel's hub sits, first to last (the target is last).
// Phones zigzag down the screen so the gap between the two actors survives;
// wider screens run left to right. Either grows past the viewport and scrolls.
export function layoutStations(n: number, W: number, H: number, mobile: boolean): StageLayout {
  if (mobile) {
    const avail = H - MOBILE_TOP - MOBILE_BOTTOM;
    const gap = n > 1 ? Math.min(MOBILE_GAP.max, Math.max(MOBILE_GAP.min, avail / (n - 1))) : 0;
    const points = Array.from({ length: n }, (_, i) => ({
      x: W * (i % 2 === 0 ? 0.27 : 0.73),
      y: MOBILE_TOP + i * gap,
    }));
    return { points, width: W, height: Math.max(H, MOBILE_TOP + (n - 1) * gap + MOBILE_BOTTOM) };
  }
  const fit = n > 1 ? (W - 2 * DESK_MARGIN) / (n - 1) : 0;
  const spacing = Math.min(DESK_SPACING.max, Math.max(DESK_SPACING.min, fit));
  const span = (n - 1) * spacing;
  const width = Math.max(W, span + 2 * DESK_MARGIN);
  const left = (width - span) / 2;
  const y = Math.max(72, H * 0.3);
  return { points: Array.from({ length: n }, (_, i) => ({ x: left + i * spacing, y })), width, height: H };
}
