// Shapes shared by the solver, the graph build and the client. No Node imports,
// so client components can import these types.

export type GraphMediaType = "movie" | "tv";

// data/costar-graph.json, as written by scripts/build-graph.ts.
export interface GraphFile {
  builtAt: string;
  params: { castDepth: number; minVotes: number };
  actors: [id: number, name: string][];
  titles: [id: number, name: string, mediaType: GraphMediaType, year: string, votes: number][];
  cast: number[][]; // cast[titleIndex] = actor indices
}

export interface GraphTitle {
  id: number;
  name: string;
  mediaType: GraphMediaType;
  year: string;
  votes: number;
}

export interface Graph {
  actorIds: number[];
  actorNames: string[];
  titles: GraphTitle[];
  actorTitles: number[][]; // actor index → title indices, ascending
  titleActors: number[][]; // title index → actor indices, ascending
  actorIndex: Map<number, number>; // TMDb id → actor index
}

export type RouteStep =
  | { kind: "actor"; id: number; name: string }
  | { kind: "title"; id: number; name: string; mediaType: GraphMediaType; year: string };

// Alternating actor, title, actor, …, actor. par = number of titles.
export interface Route {
  steps: RouteStep[];
  par: number;
}

export type SolverDifficulty = "easy" | "medium";
