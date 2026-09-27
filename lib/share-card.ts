import { Rope, drawFilm, settle, type Point } from "./film-rope";
import { STOCKS } from "./reel-model";

export interface ShareCardData {
  par: number;
  films: number; // films in the player's line
  hints: number;
  score: string; // "+2", "Par", "−1", "Gave up"
}

interface Palette {
  bg: string;
  text: string;
  sec: string;
  reel: string;
  stocks: string[];
  sans: string;
  mono: string;
}

// Share card aspect (Open Graph), from the Reel Line mock.
export const CARD_RATIO = 1.91;
const CARD_SLACK = 1.12; // a little looser than play, so short lines still hang

function palette(): Palette {
  const root = getComputedStyle(document.documentElement);
  const v = (name: string) => root.getPropertyValue(name).trim();
  return {
    bg: v("--color-bg"),
    text: v("--color-text"),
    sec: v("--color-text-secondary"),
    reel: v("--color-reel"),
    stocks: STOCKS.map(v),
    sans: v("--font-overpass") || "sans-serif",
    mono: v("--font-plex-mono") || "monospace",
  };
}

function drawReelDot(ctx: CanvasRenderingContext2D, p: Point, s: number, c: Palette) {
  ctx.fillStyle = c.reel;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.bg;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(p.x + 7.5 * s * Math.cos(a), p.y + 7.5 * s * Math.sin(a), 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The player's line as hanging film between reels, spoiler-free: no names,
// no titles. Header, film, then hints and the score.
export function drawShareCard(ctx: CanvasRenderingContext2D, W: number, H: number, d: ShareCardData) {
  if (!(W > 0 && H > 0)) return; // hidden (phones don't show the preview)
  const c = palette();
  const s = W / 440;
  const px = W * 0.06;
  const py = W * 0.05;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Header: the game, then par in mono.
  const headSize = 15 * s;
  ctx.fillStyle = c.text;
  ctx.font = `800 ${headSize}px ${c.sans}`;
  ctx.textAlign = "left";
  ctx.fillText("Six Degrees", px, py + headSize);
  ctx.fillStyle = c.sec;
  ctx.font = `400 ${13 * s}px ${c.mono}`;
  ctx.textAlign = "right";
  ctx.fillText(`Par ${d.par}`, W - px, py + headSize);

  // The line: reels along the top of the middle band, film sagging below.
  const top = py + headSize + 22 * s;
  const n = Math.max(2, d.films + 1);
  const left = px + 18 * s;
  const right = W - px - 18 * s;
  const pts = Array.from({ length: n }, (_, i) => ({ x: left + ((right - left) * i) / (n - 1), y: top + 16 * s }));
  const ropes = Array.from({ length: d.films }, (_, i) => {
    const rope = new Rope(() => pts[i], () => pts[i + 1]);
    rope.slack = CARD_SLACK;
    return rope;
  });
  settle(ropes, 600);
  ropes.forEach((rope, i) => drawFilm(ctx, rope, c.stocks[i % c.stocks.length], c.bg, 0.8 * s));
  pts.forEach((p) => drawReelDot(ctx, p, s, c));

  // Footer: hints on the left, the score big on the right.
  const scoreSize = (d.score.length > 4 ? 26 : 36) * s;
  ctx.fillStyle = c.sec;
  ctx.font = `400 ${13 * s}px ${c.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(d.hints > 0 ? `+${d.hints} hint${d.hints === 1 ? "" : "s"}` : "No hints", px, H - py);
  ctx.fillStyle = c.text;
  ctx.font = `800 ${scoreSize}px ${c.sans}`;
  ctx.textAlign = "right";
  ctx.fillText(d.score, W - px, H - py);
}

// A 1200-wide PNG of the card, for the phone share sheet.
export async function shareCardBlob(d: ShareCardData): Promise<Blob | null> {
  const c = palette();
  await Promise.all([
    document.fonts.load(`800 16px ${c.sans}`),
    document.fonts.load(`400 16px ${c.sans}`),
    document.fonts.load(`400 16px ${c.mono}`),
  ]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = Math.round(1200 / CARD_RATIO);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawShareCard(ctx, canvas.width, canvas.height, d);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
