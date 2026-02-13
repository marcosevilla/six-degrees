import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "TMDb API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const actorId = searchParams.get("actorId");
  const mediaId = searchParams.get("mediaId");
  const mediaType = searchParams.get("mediaType"); // "movie" | "tv"

  if (!actorId || !mediaId || !mediaType) {
    return NextResponse.json(
      { error: "Missing actorId, mediaId, or mediaType parameter" },
      { status: 400 }
    );
  }

  // Fetch the cast for this media
  const endpoint =
    mediaType === "tv"
      ? `${TMDB_BASE}/tv/${mediaId}/aggregate_credits?api_key=${apiKey}`
      : `${TMDB_BASE}/movie/${mediaId}/credits?api_key=${apiKey}`;

  const res = await fetch(endpoint);
  const data = await res.json();

  const cast: { id: number }[] = data.cast || [];
  const actorIdNum = parseInt(actorId, 10);
  const valid = cast.some((c) => c.id === actorIdNum);

  return NextResponse.json({ valid });
}
