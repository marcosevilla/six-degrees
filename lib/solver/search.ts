// Bidirectional BFS over the actor graph, where two actors are neighbours when
// they share a title. One step is one shared title, so par = number of titles.
import type { Graph, Route, RouteStep } from "./types";

type Parent = { prev: number; via: number } | null; // actor index, title index

function expand(g: Graph, frontier: number[], seen: Map<number, Parent>): number[] {
  const next: number[] = [];
  for (const a of frontier) {
    for (const t of g.actorTitles[a]) {
      for (const b of g.titleActors[t]) {
        if (seen.has(b)) continue;
        seen.set(b, { prev: a, via: t });
        next.push(b);
      }
    }
  }
  return next.sort((x, y) => x - y);
}

// Length of the path back to the search's origin, and how well-known its titles are.
function trail(g: Graph, seen: Map<number, Parent>, a: number): { depth: number; votes: number } {
  let depth = 0;
  let votes = 0;
  for (let p = seen.get(a); p; p = seen.get(p.prev)) {
    depth++;
    votes += g.titles[p.via].votes;
  }
  return { depth, votes };
}

export function shortestRoute(g: Graph, fromId: number, toId: number): Route | null {
  const from = g.actorIndex.get(fromId);
  const to = g.actorIndex.get(toId);
  if (from === undefined || to === undefined) return null;
  if (from === to) return { steps: [actorStep(g, from)], par: 0 };

  const fSeen = new Map<number, Parent>([[from, null]]);
  const bSeen = new Map<number, Parent>([[to, null]]);
  let fFront = [from];
  let bFront = [to];

  while (fFront.length && bFront.length) {
    const forward = fFront.length <= bFront.length;
    const seen = forward ? fSeen : bSeen;
    const other = forward ? bSeen : fSeen;
    const next = expand(g, forward ? fFront : bFront, seen);

    // Every meeting in this level: shortest first, then best-known titles, then
    // lowest actor index.
    let best: { meet: number; len: number; votes: number } | null = null;
    for (const m of next) {
      if (!other.has(m)) continue;
      const f = trail(g, fSeen, m);
      const b = trail(g, bSeen, m);
      const cand = { meet: m, len: f.depth + b.depth, votes: f.votes + b.votes };
      if (
        !best ||
        cand.len < best.len ||
        (cand.len === best.len && (cand.votes > best.votes || (cand.votes === best.votes && m < best.meet)))
      ) {
        best = cand;
      }
    }
    if (best) return buildRoute(g, fSeen, bSeen, best.meet);

    if (forward) fFront = next;
    else bFront = next;
  }
  return null;
}

function actorStep(g: Graph, i: number): RouteStep {
  return { kind: "actor", id: g.actorIds[i], name: g.actorNames[i] };
}

function titleStep(g: Graph, t: number): RouteStep {
  const x = g.titles[t];
  return { kind: "title", id: x.id, name: x.name, mediaType: x.mediaType, year: x.year, votes: x.votes };
}

function buildRoute(g: Graph, fSeen: Map<number, Parent>, bSeen: Map<number, Parent>, meet: number): Route {
  const steps: RouteStep[] = [actorStep(g, meet)];
  for (let p = fSeen.get(meet); p; p = fSeen.get(p.prev)) steps.unshift(actorStep(g, p.prev), titleStep(g, p.via));
  for (let p = bSeen.get(meet); p; p = bSeen.get(p.prev)) steps.push(titleStep(g, p.via), actorStep(g, p.prev));
  return { steps, par: (steps.length - 1) / 2 };
}
