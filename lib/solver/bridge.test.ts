import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph } from "./graph";
import { routeFromAnyActor, routeViaTitle, type CreditsSource } from "./bridge";
import { tiny } from "./__fixtures__/tiny";

const g = loadGraph(tiny);

// Off-graph actor 77 was in "Obscure" (500) with B (2), and in "Nothing" (501)
// with nobody the graph knows.
const src: CreditsSource = {
  titlesFor: async (id) =>
    id === 77
      ? [
          { id: 501, name: "Nothing", mediaType: "movie", year: "1990", votes: 50 },
          { id: 500, name: "Obscure", mediaType: "movie", year: "1999", votes: 10 },
        ]
      : [],
  castOf: async (t) => (t.id === 500 ? [77, 2] : [77, 4242]),
};

test("in-graph actors use the graph directly", async () => {
  assert.equal((await routeFromAnyActor(g, 1, 3, src))?.par, 2);
});

test("off-graph actor bridges through a shared title", async () => {
  const r = await routeFromAnyActor(g, 77, 3, src, { fromName: "Zed" });
  assert.equal(r?.par, 2);
  assert.deepEqual(r?.steps.map((s) => s.name), ["Zed", "Obscure", "B", "BC Movie", "C"]);
});

test("off-graph actor in a title with the target is par 1", async () => {
  const r = await routeFromAnyActor(g, 77, 2, src);
  assert.equal(r?.par, 1);
  assert.equal(r?.steps.length, 3);
});

test("off-graph actor with no known costars has no route", async () => {
  const lonely: CreditsSource = {
    titlesFor: async () => [{ id: 9, name: "X", mediaType: "movie", year: "", votes: 1 }],
    castOf: async () => [88],
  };
  assert.equal(await routeFromAnyActor(g, 88, 3, lonely), null);
});

test("target must be in the graph", async () => {
  assert.equal(await routeFromAnyActor(g, 1, 999, src), null);
});

test("via a chosen title: the costar with the shortest onward route", async () => {
  // Title 600 has A (1), F (6) and D (4). Onward to C (3): F is 1 step (FC Movie), D is 1 step (CD Show), A is 2.
  const viaSrc: CreditsSource = { titlesFor: async () => [], castOf: async () => [1, 6, 4, 999] };
  const title = { id: 600, name: "Chosen", mediaType: "movie" as const, year: "2020", votes: 1 };
  const r = await routeViaTitle(g, 1, title, 3, viaSrc, { fromName: "A" });
  assert.equal(r?.par, 2);
  // Tie between D (CD Show, 700 votes) and F (FC Movie, 500): best-known wins.
  assert.deepEqual(r?.steps.map((s) => s.name), ["A", "Chosen", "D", "CD Show", "C"]);
});

test("via a title that contains the target: par 1", async () => {
  const viaSrc: CreditsSource = { titlesFor: async () => [], castOf: async () => [1, 3] };
  const title = { id: 601, name: "Has C", mediaType: "movie" as const, year: "", votes: 1 };
  assert.equal((await routeViaTitle(g, 1, title, 3, viaSrc))?.par, 1);
});

test("via a title with nobody the graph knows: no route", async () => {
  const viaSrc: CreditsSource = { titlesFor: async () => [], castOf: async () => [1, 999] };
  const title = { id: 602, name: "Dead end", mediaType: "movie" as const, year: "", votes: 1 };
  assert.equal(await routeViaTitle(g, 1, title, 3, viaSrc), null);
});
