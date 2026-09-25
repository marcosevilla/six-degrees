// Server-only: reads the committed graph and pool, and fetches credits for the
// bridge. Only route handlers import this (it uses node:fs).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolActor } from "@/lib/types";
import {
  TMDB_BASE,
  castMemberActs,
  castPath,
  creditKey,
  isActingRole,
  isAwardsShow,
  toMediaType,
  type CastMember,
  type CreditEntry,
} from "@/lib/tmdb-rules";
import { TMDB_CREDITS_TTL, tmdbCache } from "@/lib/api-cache";
import { loadGraph } from "./graph";
import type { Graph } from "./types";
import type { BridgeTitle, CreditsSource } from "./bridge";

let graph: Graph | null = null;
let pool: PoolActor[] | null = null;

// Loaded once per server instance. data/ is traced into the functions via
// outputFileTracingIncludes in next.config.ts.
export function getGraph(): Graph {
  graph ??= loadGraph(JSON.parse(readFileSync(join(process.cwd(), "data/costar-graph.json"), "utf8")));
  return graph;
}

export function getPool(): PoolActor[] {
  pool ??= JSON.parse(readFileSync(join(process.cwd(), "data/actor-pool.json"), "utf8")).actors as PoolActor[];
  return pool;
}

export type EligibleCredit = CreditEntry & {
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

// A person's acting credits that count as connections, one per title.
export async function eligibleCredits(apiKey: string, actorId: number): Promise<EligibleCredit[]> {
  const res = await fetch(
    `${TMDB_BASE}/person/${actorId}/combined_credits?api_key=${apiKey}`,
    tmdbCache(TMDB_CREDITS_TTL),
  );
  if (!res.ok) throw new Error(`combined_credits ${res.status}`);
  const seen = new Set<string>();
  const cast: EligibleCredit[] = (await res.json()).cast ?? [];
  return cast.filter((c) => {
    const key = creditKey(c);
    if (seen.has(key)) return false;
    if (!isActingRole(c) || isAwardsShow(toMediaType(c.media_type), c.title ?? c.name)) return false;
    seen.add(key);
    return true;
  });
}

export function tmdbCreditsSource(apiKey: string): CreditsSource {
  return {
    async titlesFor(actorId) {
      return (await eligibleCredits(apiKey, actorId)).map(
        (c): BridgeTitle => ({
          id: c.id,
          name: c.title ?? c.name ?? "",
          mediaType: toMediaType(c.media_type),
          year: (c.release_date ?? c.first_air_date ?? "").slice(0, 4),
          votes: c.vote_count ?? 0,
        }),
      );
    },
    async castOf(t) {
      const res = await fetch(`${TMDB_BASE}${castPath(t.mediaType, t.id)}?api_key=${apiKey}`, tmdbCache(TMDB_CREDITS_TTL));
      if (!res.ok) return [];
      const cast: CastMember[] = (await res.json()).cast ?? [];
      return cast.filter(castMemberActs).map((m) => m.id);
    },
  };
}
