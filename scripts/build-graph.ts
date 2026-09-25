// Builds the costar graph the solver runs on. Rerun whenever the pool changes,
// and at least monthly alongside build:pool (TMDb's 6-month cache limit).
//
//   npm run build:graph        # writes data/costar-graph.json
//
// Graph = every eligible acting credit of every pool actor, plus the top 15
// billed cast (acting roles only) of each of those titles with 100+ votes.
// Non-pool actors who appear in only one title are dropped: they can never sit
// in the middle of a route. Every rule comes from lib/tmdb-rules.ts, so the
// solver and gameplay can't disagree about what counts as a connection.
// TMDb responses are cached in .cache/graph-build, so a rerun is cheap.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
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
} from "../lib/tmdb-rules";
import { loadGraph } from "../lib/solver/graph";
import { shortestRoute } from "../lib/solver/search";
import type { GraphFile } from "../lib/solver/types";

const CAST_DEPTH = 15;
const MIN_VOTES = 100;
const CONCURRENCY = 10;

const root = resolve(__dirname, "..");
const cacheDir = join(root, ".cache", "graph-build");
mkdirSync(cacheDir, { recursive: true });

function apiKey(): string {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  const match = env.match(/^TMDB_API_KEY=["']?([^"'\n]+)/m);
  if (!match) throw new Error("TMDB_API_KEY not found in env or .env.local");
  return match[1];
}
const KEY = apiKey();
let network = 0;

async function tmdb(path: string): Promise<any> {
  const file = join(cacheDir, createHash("sha1").update(path).digest("hex") + ".json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${KEY}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) {
      network++;
      const data = await res.json();
      writeFileSync(file, JSON.stringify(data));
      return data;
    }
    if (res?.status === 404) {
      writeFileSync(file, "null");
      return null;
    }
    await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
  }
  throw new Error(`TMDb request failed: ${path}`);
}

// Small worker pool so we stay well under TMDb's rate limit.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

type Credit = CreditEntry & { title?: string; name?: string; release_date?: string; first_air_date?: string };
type Title = {
  key: string;
  id: number;
  mediaType: "movie" | "tv";
  name: string;
  year: string;
  votes: number;
  pool: Set<number>;
};

async function main() {
  const t0 = Date.now();
  const pool: { id: number; name: string }[] = JSON.parse(
    readFileSync(join(root, "data/actor-pool.json"), "utf8"),
  ).actors;
  const poolIds = new Set(pool.map((a) => a.id));

  // 1. Every eligible acting credit of every pool actor.
  const titles = new Map<string, Title>();
  const credits = await mapLimit(pool, CONCURRENCY, (a) => tmdb(`/person/${a.id}/combined_credits`));
  credits.forEach((data, i) => {
    for (const c of (data?.cast ?? []) as Credit[]) {
      if (!isActingRole(c)) continue;
      const mediaType = toMediaType(c.media_type);
      const name = c.title ?? c.name ?? "";
      if (isAwardsShow(mediaType, name)) continue;
      const key = creditKey(c);
      const t = titles.get(key) ?? {
        key,
        id: c.id,
        mediaType,
        name,
        year: (c.release_date ?? c.first_air_date ?? "").slice(0, 4),
        votes: c.vote_count ?? 0,
        pool: new Set<number>(),
      };
      t.pool.add(pool[i].id);
      titles.set(key, t);
    }
  });
  console.log(`pool credits done: ${titles.size} titles (${Math.round((Date.now() - t0) / 1000)}s)`);

  // 2. Casts. Titles under MIN_VOTES keep only their pool actors, so no fetch.
  const all = [...titles.values()];
  const big = all.filter((t) => t.votes >= MIN_VOTES);
  let done = 0;
  const casts = await mapLimit(big, CONCURRENCY, async (t) => {
    const data = await tmdb(castPath(t.mediaType, t.id));
    if (++done % 1000 === 0) console.log(`casts ${done}/${big.length} (${Math.round((Date.now() - t0) / 1000)}s)`);
    return data;
  });
  const members = new Map<string, { id: number; name: string }[]>();
  big.forEach((t, i) => {
    const cast = ((casts[i]?.cast ?? []) as (CastMember & { name: string })[])
      .filter(castMemberActs)
      .slice(0, CAST_DEPTH)
      .map((m) => ({ id: m.id, name: m.name }));
    members.set(t.key, cast);
  });

  // 3. Assemble, then drop non-pool actors who appear in only one title.
  const names = new Map(pool.map((a) => [a.id, a.name]));
  const titleCast = all.map((t) => {
    const ids = new Set<number>(t.pool);
    for (const m of members.get(t.key) ?? []) {
      ids.add(m.id);
      if (!names.has(m.id)) names.set(m.id, m.name);
    }
    return [...ids];
  });
  const degree = new Map<number, number>();
  for (const ids of titleCast) for (const id of ids) degree.set(id, (degree.get(id) ?? 0) + 1);
  const keep = (id: number) => poolIds.has(id) || (degree.get(id) ?? 0) >= 2;

  const actorIds = [...degree.keys()].filter(keep).sort((a, b) => a - b);
  const actorIdx = new Map(actorIds.map((id, i) => [id, i]));
  const kept = all
    .map((t, i) => ({ t, ids: titleCast[i].filter(keep) }))
    .filter((x) => x.ids.length >= 2)
    .sort((a, b) => a.t.key.localeCompare(b.t.key));

  const file: GraphFile = {
    builtAt: new Date().toISOString(),
    params: { castDepth: CAST_DEPTH, minVotes: MIN_VOTES },
    actors: actorIds.map((id) => [id, names.get(id) ?? ""]),
    titles: kept.map(({ t }) => [t.id, t.name, t.mediaType, t.year, t.votes]),
    cast: kept.map(({ ids }) => ids.map((id) => actorIdx.get(id)!).sort((a, b) => a - b)),
  };

  // 4. Checks: every pool actor is in the graph; par histogram over all pool pairs.
  const missing = pool.filter((a) => !actorIdx.has(a.id));
  if (missing.length) {
    throw new Error(`Pool actors missing from graph: ${missing.map((a) => a.name).join(", ")}`);
  }
  const g = loadGraph(file);
  const hist: Record<string, number> = {};
  const ids = pool.map((a) => a.id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const par = shortestRoute(g, ids[i], ids[j])?.par ?? "none";
      hist[par] = (hist[par] ?? 0) + 1;
    }
  }

  const out = join(root, "data/costar-graph.json");
  writeFileSync(out, JSON.stringify(file));
  console.log(
    JSON.stringify(
      {
        actors: file.actors.length,
        titles: file.titles.length,
        kb: Math.round(readFileSync(out).length / 1024),
        tmdbCalls: network,
        seconds: Math.round((Date.now() - t0) / 1000),
        parHistogram: hist,
      },
      null,
      1,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
