import { Difficulty, MediaResult, PersonResult, PoolActor } from "./types";
import type { Route } from "./solver/types";

export async function searchMedia(query: string): Promise<MediaResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `/api/tmdb/search?query=${encodeURIComponent(query)}&type=media`,
  );
  const data = await res.json();
  return data.results || [];
}

export async function searchPeople(query: string): Promise<PersonResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `/api/tmdb/search?query=${encodeURIComponent(query)}&type=person`,
  );
  const data = await res.json();
  return data.results || [];
}

export async function validateConnection(
  actorId: number,
  mediaId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> {
  const res = await fetch(
    `/api/tmdb/validate?actorId=${actorId}&mediaId=${mediaId}&mediaType=${mediaType}`,
  );
  const data = await res.json();
  return data.valid;
}

export type Puzzle = { start: PoolActor; target: PoolActor; par: number };

// A fresh verified pair for the difficulty. Throws so the reveal can offer Retry.
export async function fetchPuzzle(difficulty: Difficulty): Promise<Puzzle> {
  const res = await fetch(`/api/puzzle?difficulty=${difficulty}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`puzzle ${res.status}`);
  return res.json();
}

// Checks a shared pair. null = the pair can't be played.
export async function fetchPuzzleForPair(startId: number, targetId: number): Promise<Puzzle | null> {
  const res = await fetch(`/api/puzzle?start=${startId}&target=${targetId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`puzzle ${res.status}`);
  return res.json();
}

// Best route from any actor to the target. null = no route from there.
export async function fetchRoute(fromId: number, toId: number): Promise<Route | null> {
  const res = await fetch(`/api/route?from=${fromId}&to=${toId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`route ${res.status}`);
  return (await res.json()).route;
}

// Hint rung 1: the actor's five best-known eligible titles.
export async function fetchFilmography(actorId: number): Promise<MediaResult[]> {
  const res = await fetch(`/api/tmdb/filmography?id=${actorId}`);
  if (!res.ok) throw new Error(`filmography ${res.status}`);
  return (await res.json()).films;
}
