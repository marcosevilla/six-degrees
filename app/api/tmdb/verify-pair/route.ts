import { NextRequest, NextResponse } from "next/server";
import { DAY, TMDB_CREDITS_TTL, cachedJson, rateLimit, tmdbCache } from "@/lib/api-cache";

import {
  TMDB_BASE,
  CastMember,
  CreditEntry,
  byReach,
  castMemberActs,
  castPath,
  creditKey,
  isActingRole,
  toMediaType,
} from "@/lib/tmdb-rules";

const SAMPLE_SIZE = 10;

// The acting-role rules (talk shows, awards, documentaries, archive footage)
// and credit keying live in lib/tmdb-rules.ts, shared with validate and search.

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

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
      tmdbCache(TMDB_CREDITS_TTL),
    ),
    fetch(
      `${TMDB_BASE}/person/${endId}/combined_credits?api_key=${apiKey}`,
      tmdbCache(TMDB_CREDITS_TTL),
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
    return cachedJson({ connectable: true, minSteps: 1 }, DAY);
  }

  // No direct shared credit — check for shared co-stars.
  // Sample each actor's best-known credits; a 2-step link is only found when the
  // bridging title falls in both samples, so ordering matters more than size.
  const topStart = [...startCredits].sort(byReach).slice(0, SAMPLE_SIZE);

  // Fetch cast for start actor's movies and check if any cast member
  // also appears in any of end actor's movies
  const castResponses = await Promise.all(
    topStart.map(async (credit) => {
      const path = castPath(toMediaType(credit.media_type), credit.id);
      const res = await fetch(
        `${TMDB_BASE}${path}?api_key=${apiKey}`,
        tmdbCache(TMDB_CREDITS_TTL),
      );
      const data = await res.json();
      const cast: CastMember[] = (data.cast || []).filter(castMemberActs);
      return { cast };
    }),
  );

  for (const castData of castResponses) {
    const cast = castData.cast;
    for (const member of cast) {
      // Check if this co-star has any credit in common with end actor
      // For efficiency, we just check if this co-star IS the end actor
      if (member.id === Number(endId)) {
        return cachedJson({ connectable: true, minSteps: 1 }, DAY);
      }
    }
  }

  // Also check: do any of start's co-stars appear in end's credits?
  const startCoStarIds = new Set<number>();
  for (const castData of castResponses) {
    const cast = castData.cast;
    for (const member of cast) {
      startCoStarIds.add(member.id);
    }
  }

  // Fetch cast for end actor's best-known credits
  const topEnd = [...endCredits].sort(byReach).slice(0, SAMPLE_SIZE);
  const endCastResponses = await Promise.all(
    topEnd.map(async (credit) => {
      const path = castPath(toMediaType(credit.media_type), credit.id);
      const res = await fetch(
        `${TMDB_BASE}${path}?api_key=${apiKey}`,
        tmdbCache(TMDB_CREDITS_TTL),
      );
      const data = await res.json();
      const cast: CastMember[] = (data.cast || []).filter(castMemberActs);
      return { cast };
    }),
  );

  for (const castData of endCastResponses) {
    const cast = castData.cast;
    for (const member of cast) {
      if (startCoStarIds.has(member.id)) {
        return cachedJson({ connectable: true, minSteps: 2 }, DAY);
      }
    }
  }

  // Couldn't confirm connection in 2 steps — still likely connectable
  // but we can't prove it cheaply
  return cachedJson({ connectable: false, minSteps: null }, DAY);
}
