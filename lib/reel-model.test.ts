import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "./reel-model";
import type { ChainLink } from "./types";

const target = { id: 9, name: "Target" };
const A: ChainLink = { type: "actor", id: 1, name: "Start" };
const F1: ChainLink = { type: "media", id: 100, name: "Film One", mediaType: "movie" };
const B: ChainLink = { type: "actor", id: 2, name: "Middle" };
const F2: ChainLink = { type: "media", id: 200, name: "Film Two", mediaType: "tv" };
const T: ChainLink = { type: "actor", id: 9, name: "Target" };

test("a fresh round is the start reel and the target reel, no film", () => {
  const m = buildModel([A], target);
  assert.deepEqual(m.stations.map((s) => s.role), ["start", "target"]);
  assert.equal(m.films.length, 0);
});

test("a picked film dangles from the current actor", () => {
  const m = buildModel([A, F1], target);
  assert.deepEqual(m.films.map((f) => [f.from, f.to]), [["a0-1", null]]);
});

test("picking an actor clips the film onto their reel; the next film gets the next stock", () => {
  const m = buildModel([A, F1, B, F2], target);
  assert.deepEqual(m.stations.map((s) => s.key), ["a0-1", "a2-2", "target"]);
  assert.deepEqual(m.films.map((f) => [f.from, f.to, f.stock]), [["a0-1", "a2-2", 0], ["a2-2", null, 1]]);
});

test("closing the chain hangs the last film on the target reel", () => {
  const m = buildModel([A, F1, T], target);
  assert.deepEqual(m.stations.map((s) => s.key), ["a0-1", "target"]);
  assert.deepEqual(m.films.map((f) => [f.from, f.to]), [["a0-1", "target"]]);
});
