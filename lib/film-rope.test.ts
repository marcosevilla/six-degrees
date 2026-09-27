import { test } from "node:test";
import assert from "node:assert/strict";
import { Rope, settle, drawFilm } from "./film-rope";

test("a dangling film hangs straight down from its reel at rest", () => {
  const rope = new Rope(() => ({ x: 100, y: 50 }), null, 120);
  settle([rope], 2000);
  const end = rope.end();
  assert.ok(Math.abs(end.x - 100) < 2, `end x ${end.x}`);
  assert.ok(end.y > 50 + 110, `end y ${end.y}`);
});

test("a hung film keeps both ends on the hubs and sags between them", () => {
  const rope = new Rope(() => ({ x: 0, y: 0 }), () => ({ x: 300, y: 0 }));
  settle([rope], 1000);
  assert.deepEqual([rope.pts[0].x, rope.pts[0].y], [0, 0]);
  assert.deepEqual([rope.end().x, rope.end().y], [300, 0]);
  assert.ok(rope.mid().y > 20, `sag ${rope.mid().y}`);
});

test("pulling taut shortens the sag", () => {
  const rope = new Rope(() => ({ x: 0, y: 0 }), () => ({ x: 300, y: 0 }));
  settle([rope], 1000);
  const loose = rope.mid().y;
  rope.slack = 1.01;
  settle([rope], 1000);
  assert.ok(rope.mid().y < loose / 2, `${rope.mid().y} vs ${loose}`);
});

test("drawing at zero scale returns instead of looping forever", () => {
  const rope = new Rope(() => ({ x: 0, y: 0 }), () => ({ x: 100, y: 0 }));
  settle([rope], 10);
  const calls: string[] = [];
  const ctx = new Proxy({}, { get: (_, k) => (typeof k === "string" && k !== "then" ? (...a: unknown[]) => calls.push(k) : undefined), set: () => true });
  drawFilm(ctx as unknown as CanvasRenderingContext2D, rope, "#fff", "#000", 0);
  assert.equal(calls.length, 0);
});
