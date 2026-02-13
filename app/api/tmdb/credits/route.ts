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
  const id = searchParams.get("id");
  const mediaType = searchParams.get("type"); // "movie" | "tv"

  if (!id || !mediaType) {
    return NextResponse.json(
      { error: "Missing id or type parameter" },
      { status: 400 }
    );
  }

  // For TV shows, use aggregate_credits to get cast across all seasons
  const endpoint =
    mediaType === "tv"
      ? `${TMDB_BASE}/tv/${id}/aggregate_credits?api_key=${apiKey}`
      : `${TMDB_BASE}/movie/${id}/credits?api_key=${apiKey}`;

  const res = await fetch(endpoint);
  const data = await res.json();

  const cast = (data.cast || []).map(
    (c: { id: number; name: string; character?: string; roles?: { character: string }[]; profile_path: string | null }) => ({
      id: c.id,
      name: c.name,
      character: c.character || (c.roles?.[0]?.character ?? ""),
      profilePath: c.profile_path,
    }),
  );

  return NextResponse.json({ cast });
}
