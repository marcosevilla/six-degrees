import type { Graph, GraphMediaType, Route, RouteStep } from "./types";
import { shortestRoute } from "./search";

export interface BridgeTitle {
  id: number;
  name: string;
  mediaType: GraphMediaType;
  year: string;
  votes: number;
}

// Where the bridge gets credits for actors the graph doesn't know. The server
// implementation (lib/solver/server.ts) reads TMDb through the shared rulebook.
export interface CreditsSource {
  titlesFor(actorId: number): Promise<BridgeTitle[]>;
  castOf(title: BridgeTitle): Promise<number[]>;
}

// Players can reach actors the graph pruned away: obscure films are allowed and
// can even beat par. To hint from there, look through that actor's biggest
// titles and hop onto whichever graph actor has the shortest onward route.
export async function routeFromAnyActor(
  g: Graph,
  fromId: number,
  toId: number,
  src: CreditsSource,
  { fromName = "", maxTitles = 10 }: { fromName?: string; maxTitles?: number } = {},
): Promise<Route | null> {
  if (!g.actorIndex.has(toId)) return null;
  if (g.actorIndex.has(fromId)) return shortestRoute(g, fromId, toId);

  const titles = (await src.titlesFor(fromId)).sort((a, b) => b.votes - a.votes).slice(0, maxTitles);
  const casts = await Promise.all(titles.map((t) => src.castOf(t)));

  let bestTitle: BridgeTitle | null = null;
  let bestOnward: Route | null = null;
  titles.forEach((title, i) => {
    for (const id of [...new Set(casts[i])].sort((a, b) => a - b)) {
      if (id === fromId || !g.actorIndex.has(id)) continue;
      const onward = shortestRoute(g, id, toId);
      if (onward && (!bestOnward || onward.par < bestOnward.par)) {
        bestTitle = title;
        bestOnward = onward;
      }
    }
  });
  if (!bestTitle || !bestOnward) return null;

  const t: BridgeTitle = bestTitle;
  const onward: Route = bestOnward;
  const head: RouteStep[] = [
    { kind: "actor", id: fromId, name: fromName },
    { kind: "title", id: t.id, name: t.name, mediaType: t.mediaType, year: t.year },
  ];
  return { steps: [...head, ...onward.steps], par: onward.par + 1 };
}
