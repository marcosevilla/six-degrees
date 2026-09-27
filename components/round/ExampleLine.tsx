"use client";

import { useEffect, useRef } from "react";
import { Rope, drawFilm, settle } from "@/lib/film-rope";
import { ReelFace, ReelPlate } from "./Reel";

const W = 320;
const H = 136;
const A = { x: 52, y: 34 };
const B = { x: W - 52, y: 34 };

// The home screen's one-line lesson: two reels and the film they share,
// drawn at rest with the same physics as the game. No motion.
export function ExampleLine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const root = getComputedStyle(document.documentElement);
    const rope = new Rope(() => A, () => B);
    settle([rope]);
    drawFilm(ctx, rope, root.getPropertyValue("--color-stock-blue").trim(), root.getPropertyValue("--color-bg").trim());
  }, []);

  return (
    <figure className="relative shrink-0" style={{ width: W, height: H }} aria-label="Example: Leonardo DiCaprio and Tom Hardy, linked by Inception (2010)">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: W, height: H }} aria-hidden="true" />
      {[
        { p: A, name: "Leonardo DiCaprio" },
        { p: B, name: "Tom Hardy" },
      ].map(({ p, name }) => (
        <div key={name} className="reel" style={{ left: p.x, top: p.y }} aria-hidden="true">
          <div className="reel-body">
            <ReelPlate />
            <ReelFace name={name} />
            <span className="reel-name">{name}</span>
          </div>
        </div>
      ))}
      <div className="film-label" style={{ left: W / 2, top: 92 }} aria-hidden="true">
        <b>Inception</b>
        <span className="font-mono">2010</span>
      </div>
    </figure>
  );
}
