import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

interface CreditEntry {
  id: number;
  media_type?: string;
}

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

  const startCredits: CreditEntry[] = startData.cast || [];
  const endCredits: CreditEntry[] = endData.cast || [];

  // Build set of media IDs for the start actor
  const startMediaIds = new Set(startCredits.map((c) => c.id));

  // Check if end actor shares any media with start actor
  const sharedMedia = endCredits.find((c) => startMediaIds.has(c.id));

  if (sharedMedia) {
    return NextResponse.json({ connectable: true, minSteps: 1 });
  }

  // No direct shared credit — check for shared co-stars
  // Get cast lists for start actor's top 10 most recent credits
  const startMovieIds = startCredits.slice(0, 10).map((c) => c.id);
  const endMovieIds = new Set(endCredits.map((c) => c.id));

  // Fetch cast for start actor's movies and check if any cast member
  // also appears in any of end actor's movies
  const castResponses = await Promise.all(
    startMovieIds.map(async (movieId) => {
      const mediaType =
        startCredits.find((c) => c.id === movieId)?.media_type || "movie";
      const res = await fetch(
        `${TMDB_BASE}/${mediaType}/${movieId}/credits?api_key=${apiKey}`,
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

  // Fetch cast for end actor's top 10 credits
  const endMovieSlice = endCredits.slice(0, 10).map((c) => c.id);
  const endCastResponses = await Promise.all(
    endMovieSlice.map(async (movieId) => {
      const mediaType =
        endCredits.find((c) => c.id === movieId)?.media_type || "movie";
      const res = await fetch(
        `${TMDB_BASE}/${mediaType}/${movieId}/credits?api_key=${apiKey}`,
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
