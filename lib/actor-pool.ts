import { PoolActor } from "./types";

export const CHAIN_SOFT_LIMIT = 10;

// TMDb image helpers
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getProfileUrl(path: string | null, size = "w185"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getPosterUrl(path: string | null, size = "w154"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// Client-side module cache — persists across renders, resets on page reload
let _pool: PoolActor[] | null = null;

export async function fetchActorPool(): Promise<PoolActor[]> {
  if (_pool) return _pool;
  const res = await fetch("/api/tmdb/pool");
  const data = await res.json();
  _pool = data.actors || [];
  return _pool!;
}
