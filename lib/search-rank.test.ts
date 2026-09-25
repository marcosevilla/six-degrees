import { test } from "node:test";
import assert from "node:assert/strict";
import { rankByMatch } from "./search-rank";

const item = (title: string, popularity: number) => ({ title, popularity });

test("exact title matches beat more popular partial matches", () => {
  const ranked = rankByMatch("The Family", [
    item("The Addams Family", 90),
    item("All in the Family", 80),
    item("The Family", 12),
  ]);
  assert.equal(ranked[0].title, "The Family");
});

test("prefix matches come next, then popularity", () => {
  const ranked = rankByMatch("dune", [item("Dune: Part Two", 50), item("Dune", 40), item("Children of Dune", 99)]);
  assert.deepEqual(ranked.map((r) => r.title), ["Dune", "Dune: Part Two", "Children of Dune"]);
});

test("matching ignores case, punctuation and a leading 'the'", () => {
  const ranked = rankByMatch("office", [item("Office Space", 60), item("The Office", 30)]);
  assert.equal(ranked[0].title, "The Office");
});
