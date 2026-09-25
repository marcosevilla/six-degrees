import { NextRequest, NextResponse } from "next/server";
import { DAY, TMDB_CREDITS_TTL, cachedJson, rateLimit, tmdbCache } from "@/lib/api-cache";

const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "TMDb API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Valid person ID required" }, { status: 400 });
  }

  const res = await fetch(
    `${TMDB_BASE}/person/${id}?api_key=${apiKey}`,
    tmdbCache(TMDB_CREDITS_TTL),
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const data = await res.json();

  return cachedJson(
    { id: data.id, name: data.name, profilePath: data.profile_path },
    DAY,
  );
}
