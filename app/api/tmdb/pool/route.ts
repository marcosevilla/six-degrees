import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TARGET_SIZE = 200;
const MAX_PAGES = 40; // Pull from top of TMDb popularity
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MIN_ENGLISH_KNOWN_FOR = 2; // At least 2 English-language known_for entries
const MIN_VOTE_COUNT = 3000; // known_for entries must have 3000+ votes
const MIN_QUALIFYING_ENTRIES = 2; // At least 2 entries meeting the vote threshold

interface TMDbKnownFor {
  original_language?: string;
  media_type?: string;
  vote_count?: number;
}

interface TMDbPopularPerson {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  known_for?: TMDbKnownFor[];
}

// Module-level server cache — survives across requests, resets on deploy
let cachedPool: { id: number; name: string; profilePath: string | null }[] | null = null;
let cacheTimestamp = 0;

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "TMDb API key not configured" },
      { status: 500 },
    );
  }

  // Return cached pool if fresh
  if (cachedPool && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({ actors: cachedPool });
  }

  const actors: { id: number; name: string; profilePath: string | null }[] = [];
  const seenIds = new Set<number>();
  let page = 1;

  while (actors.length < TARGET_SIZE && page <= MAX_PAGES) {
    const res = await fetch(
      `${TMDB_BASE}/person/popular?api_key=${apiKey}&page=${page}`,
    );
    const data = await res.json();
    const results: TMDbPopularPerson[] = data.results || [];

    for (const person of results) {
      if (actors.length >= TARGET_SIZE) break;
      if (seenIds.has(person.id)) continue;

      // Must be an actor
      if (person.known_for_department !== "Acting") continue;

      // Must have a profile photo
      if (!person.profile_path) continue;

      const knownFor = person.known_for || [];

      // Must have at least 2 English-language known_for entries
      const englishEntries = knownFor.filter(
        (w) => w.original_language === "en",
      );
      if (englishEntries.length < MIN_ENGLISH_KNOWN_FOR) continue;

      // At least 2 of their known_for entries must have 1000+ votes
      // This ensures they've been in widely-seen, mainstream productions
      const highVoteEntries = knownFor.filter(
        (w) => w.original_language === "en" && (w.vote_count ?? 0) >= MIN_VOTE_COUNT,
      );
      if (highVoteEntries.length < MIN_QUALIFYING_ENTRIES) continue;

      seenIds.add(person.id);
      actors.push({
        id: person.id,
        name: person.name,
        profilePath: person.profile_path,
      });
    }

    page++;
  }

  // Cache the result
  cachedPool = actors;
  cacheTimestamp = Date.now();

  return NextResponse.json({ actors });
}
