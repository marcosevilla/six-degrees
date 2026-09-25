import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph } from "./graph";
import { routeFromAnyActor, type CreditsSource } from "./bridge";
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
