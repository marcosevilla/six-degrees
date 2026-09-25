import type { Graph, GraphFile } from "./types";

// Turns the compact file into adjacency lists both ways. Each actor's titles are
// ordered best-known first (vote count), so a search reaches people through
// titles players recognize before obscure ones. Ties fall back to index order,
// so routes are stable.
export function loadGraph(file: GraphFile): Graph {
  const votes = file.titles.map((t) => t[4]);
  const actorTitles: number[][] = file.actors.map(() => []);
  const titleActors = file.cast.map((members, t) => {
    const sorted = [...new Set(members)].sort((a, b) => a - b);
    for (const a of sorted) actorTitles[a].push(t);
    return sorted;
  });
  for (const list of actorTitles) list.sort((a, b) => votes[b] - votes[a] || a - b);
  return {
    actorIds: file.actors.map(([id]) => id),
    actorNames: file.actors.map(([, name]) => name),
    titles: file.titles.map(([id, name, mediaType, year, votes]) => ({ id, name, mediaType, year, votes })),
    actorTitles,
    titleActors,
    actorIndex: new Map(file.actors.map(([id], i) => [id, i])),
  };
}
