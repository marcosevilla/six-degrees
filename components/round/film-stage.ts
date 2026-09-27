import { Rope, drawFilm, settle, type Point } from "@/lib/film-rope";
import { layoutStations } from "@/lib/reel-layout";
import { FILM_PHYSICS as P, REEL_MOTION as M } from "@/lib/motion";

interface Station extends Point {
  tx: number;
  ty: number;
}

interface Film {
  rope: Rope;
  color: string;
  toKey: string | null; // the reel its far end is on; null while dangling
}

// Imperative half of ReelStage: a canvas of hanging film between reels that
// React renders as DOM. React says what exists (stations, films, who a film
// hangs from); this class animates it and positions the reels and labels.
// The sim only runs while something is moving: no idle sway.
export class FilmStage {
  private outer: HTMLElement;
  private inner: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ground = "#000";
  private reduce: boolean;
  private W = 0;
  private H = 0;
  private order: string[] = [];
  private stations = new Map<string, Station>();
  private films = new Map<string, Film>();
  private running = false;
  private calm = 0;
  private frame = 0;
  private resize: ResizeObserver;

  constructor(outer: HTMLElement, inner: HTMLElement, canvas: HTMLCanvasElement) {
    this.outer = outer;
    this.inner = inner;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.ground = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim() || "#15171B";
    this.resize = new ResizeObserver(() => {
      this.place(true);
      this.kick();
    });
    this.resize.observe(outer);
  }

  destroy() {
    this.resize.disconnect();
    cancelAnimationFrame(this.frame);
    this.running = false;
  }

  // --- stations (reels) ---

  setStations(keys: string[]) {
    this.order = keys;
    for (const k of [...this.stations.keys()]) if (!keys.includes(k)) this.stations.delete(k);
    this.place(false);
  }

  private at = (key: string) => () => this.stations.get(key) ?? { x: 0, y: 0 };

  // Lay the reels out for the current size. New reels start in place; existing
  // ones glide to their new spot (the film follows) unless `snap`.
  private place(snap: boolean) {
    const W = this.outer.clientWidth;
    const H = this.outer.clientHeight;
    if (!W || !H) return;
    const mobile = window.innerWidth < 768;
    const layout = layoutStations(this.order.length, W, H, mobile);
    this.W = layout.width;
    this.H = layout.height;
    this.inner.style.width = `${layout.width}px`;
    this.inner.style.height = `${layout.height}px`;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = layout.width * dpr;
    this.canvas.height = layout.height * dpr;
    this.canvas.style.width = `${layout.width}px`;
    this.canvas.style.height = `${layout.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.order.forEach((key, i) => {
      const p = layout.points[i];
      const s = this.stations.get(key);
      if (!s) this.stations.set(key, { x: p.x, y: p.y, tx: p.x, ty: p.y });
      else {
        s.tx = p.x;
        s.ty = p.y;
        if (snap || this.reduce) {
          s.x = p.x;
          s.y = p.y;
        }
      }
    });
    this.draw();
  }

  stationPoint(key: string): Point | null {
    const s = this.stations.get(key);
    return s ? { x: s.tx, y: s.ty } : null;
  }

  // --- films ---

  has(key: string) {
    return this.films.has(key);
  }

  keys() {
    return [...this.films.keys()];
  }

  // Which reel a film's free end is on (null: dangling).
  endOf(key: string): string | null {
    return this.films.get(key)?.toKey ?? null;
  }

  // A film appears. `animate` drops it from its reel; otherwise it's placed at rest.
  add(key: string, fromKey: string, toKey: string | null, color: string, animate: boolean) {
    const rope = new Rope(this.at(fromKey), toKey ? this.at(toKey) : null);
    this.films.set(key, { rope, color, toKey });
    if (!animate) settle([rope]);
  }

  remove(key: string) {
    this.films.delete(key);
  }

  // A dangling film clips onto a reel: the free end swings over, then gravity takes it.
  attach(key: string, toKey: string) {
    const film = this.films.get(key);
    if (!film) return;
    const { rope } = film;
    const start = { ...rope.end() };
    const t0 = performance.now();
    const target = this.at(toKey);
    film.toKey = toKey;
    rope.pinB = () => {
      const k = this.reduce ? 1 : Math.min(1, (performance.now() - t0) / M.clipOnMs);
      const e = 1 - (1 - k) ** 3;
      const b = target();
      const lift = Math.sin(k * Math.PI) * M.clipLiftPx;
      if (k >= 1) {
        rope.pinB = null;
        rope.to = target;
      }
      return { x: start.x + (b.x - start.x) * e, y: start.y + (b.y - start.y) * e - lift };
    };
  }

  // The far reel went away (undo): the film falls back to dangling.
  detach(key: string) {
    const film = this.films.get(key);
    if (!film) return;
    film.toKey = null;
    film.rope.detach();
  }

  // Closing the chain: every strip pulls taut for a beat, then relaxes.
  tauten() {
    this.films.forEach(({ rope }) => (rope.slack = P.closeSlack));
    this.kick();
    setTimeout(() => {
      this.films.forEach(({ rope }) => (rope.slack = P.relaxSlack));
      this.kick();
    }, M.tautMs);
  }

  // Where a film's label goes: under its middle, or under its free end.
  labelPoint(key: string): (Point & { free: boolean }) | null {
    const rope = this.films.get(key)?.rope;
    if (!rope) return null;
    const free = rope.free;
    const m = free ? rope.end() : rope.mid();
    return { x: Math.min(this.W - 72, Math.max(72, m.x)), y: m.y + (free ? 12 : 14), free };
  }

  // --- loop ---

  kick() {
    this.calm = 0;
    if (this.reduce) {
      this.stations.forEach((s) => {
        s.x = s.tx;
        s.y = s.ty;
      });
      // Clip-ons resolve on their first step with reduced motion.
      settle([...this.films.values()].map((f) => f.rope), 400);
      this.draw();
      return;
    }
    if (!this.running) {
      this.running = true;
      this.frame = requestAnimationFrame(this.loop);
    }
  }

  private loop = () => {
    let v = 0;
    this.stations.forEach((s) => {
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      s.x += dx * 0.2;
      s.y += dy * 0.2;
      v = Math.max(v, Math.abs(dx) + Math.abs(dy) > 0.5 ? 1 : 0);
      if (Math.abs(dx) + Math.abs(dy) <= 0.5) {
        s.x = s.tx;
        s.y = s.ty;
      }
    });
    for (let i = 0; i < P.stepsPerFrame; i++) {
      this.films.forEach(({ rope }) => {
        v = Math.max(v, rope.step());
        if (rope.pinB) v = 1;
      });
    }
    this.draw();
    this.calm = v < P.settleSpeed ? this.calm + 1 : 0;
    if (this.calm < P.calmFrames) this.frame = requestAnimationFrame(this.loop);
    else this.running = false;
  };

  draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.W, this.H);
    this.films.forEach(({ rope, color }) => drawFilm(ctx, rope, color, this.ground));
    // Reels and labels are DOM; move them with the sim.
    this.inner.querySelectorAll<HTMLElement>("[data-station]").forEach((el) => {
      const s = this.stations.get(el.dataset.station!);
      if (!s) return;
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
    });
    this.inner.querySelectorAll<HTMLElement>("[data-film-label]").forEach((el) => {
      const p = this.labelPoint(el.dataset.filmLabel!);
      if (!p) return;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    });
  }
}
