// Builds the actor pool: a committed, deterministic list of actors players
// actually recognize. Every server serves the same file, so a daily puzzle
// picked from it is the same for everyone.
//
//   npm run build:pool            # writes data/actor-pool.json
//
// Rerun at least monthly. TMDb's terms cap cached data at 6 months, and the
// smoke test fails once the file is older than that.
//
// How actors are ranked ("reach"): take the most-voted English films and TV
// shows, plus the most-voted recent films so newer stars aren't crowded out.
// Every billed actor in each title earns that title's vote count, weighted by
// billing order (leads count more than the 9th name) and halved for voice-only
// roles (a famous voice isn't a recognizable face). A small boost from TMDb's
// current popularity breaks ties toward people who are in the conversation now.
// Then data/pool-overrides.json adds or removes people by hand.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { TMDB_BASE, isActingCharacter } from "../lib/tmdb-rules";

const POOL_SIZE = 400;
const CANDIDATES = 700; // ranked by reach before person lookups
const BILLED = 10; // cast positions that count
const MOVIE_PAGES = 25; // 20 per page → 500 most-voted English films
const RECENT_PAGES = 5; // 100 most-voted films from the last 5 years
const TV_PAGES = 10; // 200 most-voted English shows
const POPULARITY_BOOST = 0.3; // at most +30% reach for currently trending people
const EXCLUDED = "99,10763,10764,10767"; // documentary, news, reality, talk

const root = resolve(__dirname, "..");

function apiKey(): string {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  const match = env.match(/^TMDB_API_KEY=["']?([^"'\n]+)/m);
  if (!match) throw new Error("TMDB_API_KEY not found in env or .env.local");
  return match[1];
}
const KEY = apiKey();

async function tmdb(path: string): Promise<any> {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${KEY}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
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

type Title = { kind: "movie" | "tv"; id: number; name: string; votes: number };

async function discover(kind: "movie" | "tv", pages: number, extra = ""): Promise<Title[]> {
  const titles: Title[] = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb(
      `/discover/${kind}?sort_by=vote_count.desc&with_original_language=en&without_genres=${EXCLUDED}&page=${page}${extra}`,
    );
    for (const r of data?.results ?? []) {
      titles.push({ kind, id: r.id, name: r.title ?? r.name, votes: r.vote_count ?? 0 });
    }
  }
  return titles;
}

type Candidate = { id: number; name: string; reach: number; titles: { name: string; weight: number }[] };

type Overrides = {
  include: { id: number; name: string }[];
  exclude: { id: number; name: string }[];
};

async function main() {
  const started = Date.now();
  const since = new Date();
  since.setFullYear(since.getFullYear() - 5);
  const sinceDate = since.toISOString().slice(0, 10);

  const [movies, recent, shows] = await Promise.all([
    discover("movie", MOVIE_PAGES),
    discover("movie", RECENT_PAGES, `&primary_release_date.gte=${sinceDate}`),
    discover("tv", TV_PAGES),
  ]);
  const seen = new Set<string>();
  const titles = [...movies, ...recent, ...shows].filter((t) => {
    const key = `${t.kind}:${t.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`${titles.length} titles (${movies.length} top films, ${recent.length} recent, ${shows.length} shows)`);

  const candidates = new Map<number, Candidate>();
  await mapLimit(titles, 12, async (title) => {
    const path = title.kind === "tv" ? `/tv/${title.id}/aggregate_credits` : `/movie/${title.id}/credits`;
    const data = await tmdb(path);
    const cast: any[] = (data?.cast ?? []).slice(0, BILLED);
    cast.forEach((member, order) => {
      const characters: string[] = member.roles
        ? member.roles.map((r: any) => r.character ?? "")
        : [member.character ?? ""];
      if (!characters.some(isActingCharacter)) return;
      const voiceOnly = characters.every((c) => /\(voice\)/i.test(c));
      const weight = title.votes * (1 / (1 + order * 0.25)) * (voiceOnly ? 0.5 : 1);
      const c: Candidate = candidates.get(member.id) ?? { id: member.id, name: member.name, reach: 0, titles: [] };
      c.reach += weight;
      c.titles.push({ name: title.name, weight });
      candidates.set(member.id, c);
    });
  });
  console.log(`${candidates.size} billed actors scored`);

  const overrides: Overrides = JSON.parse(readFileSync(resolve(root, "data/pool-overrides.json"), "utf8"));
  const excluded = new Set(overrides.exclude.map((p) => p.id));
  const included = new Set(overrides.include.map((p) => p.id));

  const shortlist = [...candidates.values()]
    .filter((c) => !excluded.has(c.id))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, CANDIDATES);
  for (const p of overrides.include) {
    if (!shortlist.some((c) => c.id === p.id)) {
      shortlist.push(candidates.get(p.id) ?? { id: p.id, name: p.name, reach: 0, titles: [] });
    }
  }

  // Person details: photo, department, and today's popularity for the boost.
  const people = await mapLimit(shortlist, 12, (c) => tmdb(`/person/${c.id}`));
  const maxPopularity = Math.max(...people.map((p) => p?.popularity ?? 0), 1);

  const ranked = shortlist
    .map((c, i) => ({ c, p: people[i] }))
    .filter(({ c, p }) => {
      if (!p) return false;
      if (!p.profile_path) return false;
      if (included.has(c.id)) return true;
      return p.known_for_department === "Acting";
    })
    .map(({ c, p }) => {
      const boost = 1 + POPULARITY_BOOST * Math.min((p.popularity ?? 0) / maxPopularity, 1);
      if (included.has(c.id) && p.name !== overrides.include.find((o) => o.id === c.id)?.name) {
        console.warn(`  ! override id ${c.id} is "${p.name}", not "${overrides.include.find((o) => o.id === c.id)?.name}"`);
      }
      return {
        id: c.id,
        name: p.name as string,
        profilePath: p.profile_path as string,
        score: c.reach * boost,
        forced: included.has(c.id),
        topTitles: [...c.titles].sort((a, b) => b.weight - a.weight).slice(0, 3).map((t) => t.name),
      };
    })
    .sort((a, b) => b.score - a.score);

  const forced = ranked.filter((a) => a.forced);
  const pool = [...forced, ...ranked.filter((a) => !a.forced)]
    .slice(0, POOL_SIZE)
    .sort((a, b) => b.score - a.score)
    .map(({ id, name, profilePath, score, topTitles }) => ({
      id,
      name,
      profilePath,
      reach: Math.round(score),
      topTitles,
    }));

  const out = {
    generatedAt: new Date().toISOString(),
    source: "TMDb: most-voted English films and shows, billed cast, ranked by reach. See scripts/build-pool.ts.",
    count: pool.length,
    actors: pool,
  };
  writeFileSync(resolve(root, "data/actor-pool.json"), JSON.stringify(out, null, 1) + "\n");

  console.log(`\nWrote ${pool.length} actors to data/actor-pool.json in ${Math.round((Date.now() - started) / 1000)}s`);
  const show = (from: number, to: number) =>
    console.log(`  #${from + 1}–${to}: ${pool.slice(from, to).map((a) => a.name).join(", ")}`);
  show(0, 12);
  show(150, 160);
  show(POOL_SIZE - 12, POOL_SIZE);
  if (forced.length) console.log(`  Forced in by overrides: ${forced.map((a) => a.name).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
