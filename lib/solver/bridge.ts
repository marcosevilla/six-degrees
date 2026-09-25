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

// How well-known a route's titles are, for preferring recognizable routes.
function routeVotes(r: Route): number {
  return r.steps.reduce((sum, s) => (s.kind === "title" ? sum + s.votes : sum), 0);
}

// Of these people, whose route to the target is shortest (then best-known)?
function bestOnward(g: Graph, ids: number[], toId: number, skipId: number): Route | null {
  let best: Route | null = null;
  let bestVotes = -1;
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    if (id === skipId || !g.actorIndex.has(id)) continue;
    const onward = shortestRoute(g, id, toId);
    if (!onward) continue;
    const votes = routeVotes(onward);
    if (!best || onward.par < best.par || (onward.par === best.par && votes > bestVotes)) {
      best = onward;
      bestVotes = votes;
    }
  }
  return best;
}

function prepend(fromId: number, fromName: string, t: BridgeTitle, onward: Route): Route {
  const head: RouteStep[] = [
    { kind: "actor", id: fromId, name: fromName },
    { kind: "title", id: t.id, name: t.name, mediaType: t.mediaType, year: t.year, votes: t.votes },
  ];
  return { steps: [...head, ...onward.steps], par: onward.par + 1 };
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
  let best: Route | null = null;
  titles.forEach((t, i) => {
    const onward = bestOnward(g, casts[i], toId, fromId);
    if (onward && (!best || onward.par + 1 < best.par)) best = prepend(fromId, fromName, t, onward);
  });
  return best;
}

// The player already picked a title and needs a costar from it: the best route
// that goes through that title (any title, in the graph or not).
export async function routeViaTitle(
  g: Graph,
  fromId: number,
  title: BridgeTitle,
  toId: number,
  src: CreditsSource,
  { fromName = "" }: { fromName?: string } = {},
): Promise<Route | null> {
  if (!g.actorIndex.has(toId)) return null;
  const onward = bestOnward(g, await src.castOf(title), toId, fromId);
  return onward ? prepend(fromId, fromName, title, onward) : null;
}
