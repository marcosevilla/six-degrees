import { FILM_PHYSICS as P } from "./motion";

export interface Point {
  x: number;
  y: number;
}

interface RopePoint extends Point {
  px: number;
  py: number;
}

// A film strip is a verlet rope pinned to a reel hub at `from`. With `to` it
// hangs between two hubs; without, it dangles by its own weight. Ported from
// the Reel Line mock (second-brain outputs, 2026-09-26-three-chains-directions).
export class Rope {
  from: () => Point;
  to: (() => Point) | null;
  // While clipping on, the free end follows this instead of `to`.
  pinB: (() => Point) | null = null;
  slack: number = P.slack;
  pts: RopePoint[];
  seg: number;

  constructor(from: () => Point, to: (() => Point) | null, danglingLength: number = P.danglingLength) {
    this.from = from;
    this.to = to;
    // A new film starts out to the side and swings down under its own weight.
    const a = from();
    const b = to ? to() : { x: a.x - danglingLength * 0.85, y: a.y + danglingLength * 0.3 };
    this.pts = Array.from({ length: P.points }, (_, i) => {
      const t = i / (P.points - 1);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      return { x, y, px: x, py: y };
    });
    this.seg = to ? this.targetSeg() : danglingLength / (P.points - 1);
  }

  get attached(): boolean {
    return this.to !== null;
  }

  get free(): boolean {
    return !this.to && !this.pinB;
  }

  private targetSeg(): number {
    const a = this.from();
    const b = this.to!();
    return (Math.hypot(b.x - a.x, b.y - a.y) * this.slack) / (P.points - 1);
  }

  // One fixed step. Returns the fastest point's speed, to know when to stop.
  step(dt: number = P.stepS): number {
    const g = P.gravity * dt * dt;
    const last = this.pts.length - 1;
    const endPinned = this.attached || this.pinB !== null;
    let maxV = 0;
    this.pts.forEach((p, i) => {
      if (i === 0 || (i === last && endPinned)) return;
      const vx = (p.x - p.px) * P.damping;
      const vy = (p.y - p.py) * P.damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + g;
      maxV = Math.max(maxV, Math.abs(vx) + Math.abs(vy));
    });
    // Length eases toward hub distance × slack, so taut and relax aren't snaps.
    if (this.attached && !this.pinB) this.seg += (this.targetSeg() - this.seg) * 0.2;
    for (let k = 0; k < P.iterations; k++) {
      const a = this.from();
      this.pts[0].x = a.x;
      this.pts[0].y = a.y;
      const b = this.pinB ? this.pinB() : this.to ? this.to() : null;
      if (b) {
        this.pts[last].x = b.x;
        this.pts[last].y = b.y;
      }
      for (let i = 0; i < last; i++) {
        const p = this.pts[i];
        const q = this.pts[i + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - this.seg) / d;
        const pinnedP = i === 0;
        const pinnedQ = i + 1 === last && b !== null;
        const wp = pinnedP ? 0 : pinnedQ ? 1 : 0.5;
        const wq = pinnedQ ? 0 : pinnedP ? 1 : 0.5;
        p.x += dx * diff * wp;
        p.y += dy * diff * wp;
        q.x -= dx * diff * wq;
        q.y -= dy * diff * wq;
      }
    }
    return maxV;
  }

  // Let go of the far reel: the strip falls back to dangling (undo).
  detach(danglingLength: number = P.danglingLength) {
    this.to = null;
    this.pinB = null;
    this.slack = P.slack;
    this.seg = danglingLength / (P.points - 1);
  }

  mid(): Point {
    return this.pts[Math.floor(this.pts.length / 2)];
  }

  end(): Point {
    return this.pts[this.pts.length - 1];
  }
}

// Draw a rope as 35mm stock: colored base, frame lines, rounded sprocket holes
// punched in the ground color.
export function drawFilm(ctx: CanvasRenderingContext2D, rope: Rope, color: string, ground: string, scale = 1) {
  const pts = rope.pts;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.strokeStyle = color;
  ctx.lineWidth = 16 * scale;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  let acc = 0;
  let nextHole = 5 * scale;
  let nextFrame = 22 * scale;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (!len) continue;
    const tx = (q.x - p.x) / len;
    const ty = (q.y - p.y) / len;
    const nx = -ty;
    const ny = tx;
    while (nextHole <= acc + len) {
      const t = nextHole - acc;
      const x = p.x + tx * t;
      const y = p.y + ty * t;
      ctx.fillStyle = ground;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(x + nx * s * 5.2 * scale, y + ny * s * 5.2 * scale);
        ctx.rotate(Math.atan2(ty, tx));
        ctx.beginPath();
        ctx.roundRect(-1.6 * scale, -1.4 * scale, 3.2 * scale, 2.8 * scale, 0.8 * scale);
        ctx.fill();
        ctx.restore();
      }
      nextHole += 7 * scale;
    }
    while (nextFrame <= acc + len) {
      const t = nextFrame - acc;
      const x = p.x + tx * t;
      const y = p.y + ty * t;
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - nx * 3.2 * scale, y - ny * 3.2 * scale);
      ctx.lineTo(x + nx * 3.2 * scale, y + ny * 3.2 * scale);
      ctx.stroke();
      nextFrame += 22 * scale;
    }
    acc += len;
  }
}

// Run a rope to rest without drawing (reduced motion, static cards).
export function settle(ropes: Rope[], steps = 500) {
  for (let i = 0; i < steps; i++) ropes.forEach((r) => r.step());
}
