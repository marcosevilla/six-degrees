import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

const SAMPLE_SIZE = 10;

// News, Reality, Talk
const CHAT_SHOW_GENRES = new Set([10763, 10764, 10767]);

interface CreditEntry {
  id: number;
  media_type?: string;
  vote_count?: number;
  character?: string;
  genre_ids?: number[];
}

// combined_credits mixes real roles with talk-show, awards and documentary
// appearances. Virtually every famous actor has been on Kimmel and the Oscars,
// so keeping those makes almost any pair look like they share a credit.
// Archive-footage compilations are the same trap: Final Cut: Ladies and
// Gentlemen is stitched from clips of thousands of films and credits every
// actor in them, which would link most of the pool as a single "shared movie".
function isActingRole(c: CreditEntry): boolean {
  const character = (c.character ?? "").toLowerCase();
  if (character.includes("self") || character.includes("archive")) return false;
  return !(c.genre_ids ?? []).some((g) => CHAT_SHOW_GENRES.has(g));
}

// TMDb numbers movies and TV separately, so the same integer can mean two
// different titles (movie 2034 = Training Day, tv 2034 = Drive). Always key
// credits on both fields or unrelated actors look like co-stars.
const creditKey = (c: CreditEntry) => `${c.media_type ?? "movie"}:${c.id}`;

// combined_credits comes back roughly chronological, so the head of the list is
// an actor's earliest and most obscure work. Sort by vote_count first so the
// sample below lands on the mainstream titles players actually know.
const byReach = (a: CreditEntry, b: CreditEntry) =>
  (b.vote_count ?? 0) - (a.vote_count ?? 0);

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "TMDb API key not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const startId = searchParams.get("startId");
  const endId = searchParams.get("endId");

  if (!startId || !endId) {
    return NextResponse.json(
      { error: "Missing startId or endId" },
      { status: 400 },
    );
  }

  // Fetch combined credits for both actors in parallel
  const [startRes, endRes] = await Promise.all([
    fetch(
      `${TMDB_BASE}/person/${startId}/combined_credits?api_key=${apiKey}`,
    ),
    fetch(
      `${TMDB_BASE}/person/${endId}/combined_credits?api_key=${apiKey}`,
    ),
  ]);

  const [startData, endData] = await Promise.all([
    startRes.json(),
    endRes.json(),
  ]);

  const startCredits: CreditEntry[] = (startData.cast || []).filter(
    isActingRole,
  );
  const endCredits: CreditEntry[] = (endData.cast || []).filter(isActingRole);

  // Build set of media keys for the start actor
  const startMediaKeys = new Set(startCredits.map(creditKey));

  // Check if end actor shares any media with start actor
  const sharedMedia = endCredits.find((c) => startMediaKeys.has(creditKey(c)));

  if (sharedMedia) {
    return NextResponse.json({ connectable: true, minSteps: 1 });
  }

  // No direct shared credit — check for shared co-stars.
  // Sample each actor's best-known credits; a 2-step link is only found when the
  // bridging title falls in both samples, so ordering matters more than size.
  const topStart = [...startCredits].sort(byReach).slice(0, SAMPLE_SIZE);

  // Fetch cast for start actor's movies and check if any cast member
  // also appears in any of end actor's movies
  const castResponses = await Promise.all(
    topStart.map(async (credit) => {
      const mediaType = credit.media_type || "movie";
      const res = await fetch(
        `${TMDB_BASE}/${mediaType}/${credit.id}/credits?api_key=${apiKey}`,
      );
      return res.json();
    }),
  );

  for (const castData of castResponses) {
    const cast: { id: number }[] = castData.cast || [];
    for (const member of cast) {
      // Check if this co-star has any credit in common with end actor
      // For efficiency, we just check if this co-star IS the end actor
      if (member.id === Number(endId)) {
        return NextResponse.json({ connectable: true, minSteps: 1 });
      }
    }
  }

  // Also check: do any of start's co-stars appear in end's credits?
  const startCoStarIds = new Set<number>();
  for (const castData of castResponses) {
    const cast: { id: number }[] = castData.cast || [];
    for (const member of cast) {
      startCoStarIds.add(member.id);
    }
  }

  // Fetch cast for end actor's best-known credits
  const topEnd = [...endCredits].sort(byReach).slice(0, SAMPLE_SIZE);
  const endCastResponses = await Promise.all(
    topEnd.map(async (credit) => {
      const mediaType = credit.media_type || "movie";
      const res = await fetch(
        `${TMDB_BASE}/${mediaType}/${credit.id}/credits?api_key=${apiKey}`,
      );
      return res.json();
    }),
  );

  for (const castData of endCastResponses) {
    const cast: { id: number }[] = castData.cast || [];
    for (const member of cast) {
      if (startCoStarIds.has(member.id)) {
        return NextResponse.json({ connectable: true, minSteps: 2 });
      }
    }
  }

  // Couldn't confirm connection in 2 steps — still likely connectable
  // but we can't prove it cheaply
  return NextResponse.json({ connectable: false, minSteps: null });
}
