import { MediaResult, PersonResult, PoolActor } from "./types";

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

export async function verifyPair(
  startId: number,
  endId: number,
): Promise<{ connectable: boolean; minSteps: number | null }> {
  const res = await fetch(
    `/api/tmdb/verify-pair?startId=${startId}&endId=${endId}`,
  );
  return res.json();
}

export async function fetchPerson(id: number): Promise<PoolActor | null> {
  const res = await fetch(`/api/tmdb/person?id=${id}`);
  if (!res.ok) return null;
  return res.json();
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
