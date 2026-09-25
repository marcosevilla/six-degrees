import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph } from "./graph";
import { shortestRoute } from "./search";
import { tiny } from "./__fixtures__/tiny";

const g = loadGraph(tiny);
const names = (r: ReturnType<typeof shortestRoute>) => r?.steps.map((s) => s.name);

test("direct costars are par 1", () => {
  const r = shortestRoute(g, 1, 2);
  assert.equal(r?.par, 1);
  assert.deepEqual(names(r), ["A", "AB Movie", "B"]);
});

test("two hops are par 2 with a deterministic tie-break", () => {
  const r = shortestRoute(g, 1, 3);
  assert.equal(r?.par, 2);
  assert.deepEqual(names(r), ["A", "AB Movie", "B", "BC Movie", "C"]);
});

test("three hops are par 3 and carry media types", () => {
  const r = shortestRoute(g, 1, 4);
  assert.equal(r?.par, 3);
  assert.deepEqual(r?.steps.at(-2), { kind: "title", id: 12, name: "CD Show", mediaType: "tv", year: "2003", votes: 700 });
});

test("disconnected actors have no route", () => {
  assert.equal(shortestRoute(g, 1, 5), null);
});

test("unknown actors have no route", () => {
  assert.equal(shortestRoute(g, 1, 999), null);
  assert.equal(shortestRoute(g, 999, 1), null);
});

test("same actor is par 0", () => {
  assert.deepEqual(shortestRoute(g, 3, 3), { steps: [{ kind: "actor", id: 3, name: "C" }], par: 0 });
});

test("routes are symmetric in length", () => {
  assert.equal(shortestRoute(g, 4, 1)?.par, 3);
});

test("between equal-length routes, the best-known titles win", () => {
  const two = loadGraph({
    builtAt: "",
    params: { castDepth: 15, minVotes: 100 },
    actors: [[1, "X"], [2, "Y"], [3, "Hub"], [4, "Star"]],
    titles: [
      [20, "Obscure", "movie", "1990", 5],
      [21, "Famous", "movie", "2010", 5000],
      [22, "Cartoon A", "tv", "2000", 150],
      [23, "Cartoon B", "tv", "2001", 150],
      [24, "Hit A", "movie", "2005", 9000],
      [25, "Hit B", "movie", "2006", 8000],
    ],
    // X,Y share Obscure and Famous. X→Hub→? and X→Star→? both reach 5 via two titles.
    cast: [[0, 1], [0, 1], [0, 2], [2, 1], [0, 3], [3, 1]],
  });
  assert.deepEqual(shortestRoute(two, 1, 2)?.steps.map((s) => s.name), ["X", "Famous", "Y"]);
});
