import type { Graph, SolverDifficulty } from "./types";
import { shortestRoute } from "./search";

export const PAR_FOR: Record<SolverDifficulty, number> = { easy: 1, medium: 2 };

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
): { startId: number; targetId: number; par: number } | null {
  const ids = poolIds.filter((id) => g.actorIndex.has(id));
  if (ids.length < 2) return null;
  const want = PAR_FOR[difficulty];
  for (let n = 0; n < maxSamples; n++) {
    const [startId, targetId] = sampleDistinctPair(ids, rng);
    if (shortestRoute(g, startId, targetId)?.par === want) return { startId, targetId, par: want };
  }
  return null;
}
