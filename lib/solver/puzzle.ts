import type { Graph, SolverDifficulty } from "./types";
import { shortestRoute } from "./search";

export const PAR_FOR: Record<SolverDifficulty, number> = { easy: 1, medium: 2 };

// A fair recall puzzle: every title on the best route has at least this many
// TMDb votes, so par never hinges on a TV special nobody has seen. At 1000,
// about 70% of par-1 and 92% of par-2 pool pairs qualify (2026-09-25 graph).
export const FAIR_MIN_VOTES = 1000;

// Uniform pick of two different ids. Replaces the old sort(() => random - 0.5)
// shuffle, which is biased.
export function sampleDistinctPair(ids: number[], rng: () => number): [number, number] {
  const i = Math.floor(rng() * ids.length) % ids.length;
  let j = Math.floor(rng() * (ids.length - 1)) % (ids.length - 1);
  if (j >= i) j++;
  return [ids[i], ids[j]];
}

// Samples pool pairs until one has the difficulty's par. About 1 in 4 pairs is
// par 1 and 3 in 4 are par 2, so this almost always returns within a few tries;
// maxSamples only guards against a broken graph.
export function pickPuzzle(
  g: Graph,
  poolIds: number[],
  difficulty: SolverDifficulty,
  rng: () => number = Math.random,
  maxSamples = 200,
  minRouteVotes = 0,
): { startId: number; targetId: number; par: number } | null {
  const ids = poolIds.filter((id) => g.actorIndex.has(id));
  if (ids.length < 2) return null;
  const want = PAR_FOR[difficulty];
  for (let n = 0; n < maxSamples; n++) {
    const [startId, targetId] = sampleDistinctPair(ids, rng);
    const route = shortestRoute(g, startId, targetId);
    if (route?.par !== want) continue;
    const fair = route.steps.every((s) => s.kind === "actor" || s.votes >= minRouteVotes);
    if (fair) return { startId, targetId, par: want };
  }
  return null;
}
