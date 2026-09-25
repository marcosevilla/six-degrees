import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph } from "./graph";
import { pickPuzzle, sampleDistinctPair, PAR_FOR } from "./puzzle";
import { tiny } from "./__fixtures__/tiny";

const g = loadGraph(tiny);
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

test("par bands", () => assert.deepEqual(PAR_FOR, { easy: 1, medium: 2 }));

test("sampleDistinctPair never returns the same id twice", () => {
  const [a, b] = sampleDistinctPair([7, 8], seq(0, 0));
  assert.notEqual(a, b);
});

test("easy returns a par-1 pair", () => {
  const p = pickPuzzle(g, [1, 2, 3, 4], "easy", seq(0, 0.3, 0.5, 0.9, 0.1, 0.2));
  assert.equal(p?.par, 1);
});

test("medium returns a par-2 pair", () => {
  const p = pickPuzzle(g, [1, 3], "medium", seq(0, 0.9));
  assert.deepEqual(p, { startId: 1, targetId: 3, par: 2 });
});

test("pool ids missing from the graph are ignored", () => {
  assert.equal(pickPuzzle(g, [1, 999], "easy", Math.random, 50), null);
});

test("gives up after maxSamples when the band is impossible", () => {
  assert.equal(pickPuzzle(g, [1, 5], "easy", Math.random, 20), null);
});

test("fair puzzles: every title on the best route must be well known", () => {
  // A→B is par 1 only through "AB Movie" (900 votes).
  assert.equal(pickPuzzle(g, [1, 2], "easy", Math.random, 20, 1000), null);
  assert.deepEqual(pickPuzzle(g, [1, 2], "easy", seq(0, 0), 20, 900), { startId: 1, targetId: 2, par: 1 });
});
