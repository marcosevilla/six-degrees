import { NextRequest, NextResponse } from "next/server";
import { DAY, TMDB_CREDITS_TTL, cachedJson, rateLimit, tmdbCache } from "@/lib/api-cache";
import {
  TMDB_BASE,
  CastMember,
  castMemberActs,
  castPath,
  toMediaType,
} from "@/lib/tmdb-rules";

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
  const mediaType = searchParams.get("type"); // "movie" | "tv"

  if (!id || !mediaType) {
    return NextResponse.json(
      { error: "Missing id or type parameter" },
      { status: 400 }
    );
  }

  // TV uses aggregate_credits to get cast across all seasons
  const endpoint = `${TMDB_BASE}${castPath(toMediaType(mediaType), id)}?api_key=${apiKey}`;

  const res = await fetch(endpoint, tmdbCache(TMDB_CREDITS_TTL));
  const data = await res.json();

  type Member = CastMember & { name: string; profile_path: string | null };
  const cast = (data.cast || []).filter((c: Member) => castMemberActs(c)).map(
    (c: Member) => ({
      id: c.id,
      name: c.name,
      character: c.character || (c.roles?.[0]?.character ?? ""),
      profilePath: c.profile_path,
    }),
  );

  return cachedJson({ cast }, DAY);
}
