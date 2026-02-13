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
  const query = searchParams.get("query");
  const type = searchParams.get("type") || "media"; // "media" | "person"

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const encodedQuery = encodeURIComponent(query.trim());

  if (type === "person") {
    const res = await fetch(
      `${TMDB_BASE}/search/person?api_key=${apiKey}&query=${encodedQuery}&include_adult=false`,
    );
    const data = await res.json();
    const results = (data.results || [])
      .filter((p: { known_for_department: string }) => p.known_for_department === "Acting")
      .slice(0, 10)
      .map((p: { id: number; name: string; profile_path: string | null }) => ({
        id: p.id,
        name: p.name,
        profilePath: p.profile_path,
      }));
    return NextResponse.json({ results });
  }

  // type === "media": search both movies and TV in parallel
  const [movieRes, tvRes] = await Promise.all([
    fetch(
      `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodedQuery}&include_adult=false`,
    ),
    fetch(
      `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodedQuery}&include_adult=false`,
    ),
  ]);

  const [movieData, tvData] = await Promise.all([
    movieRes.json(),
    tvRes.json(),
  ]);

  const movies = (movieData.results || []).map(
    (m: { id: number; title: string; release_date?: string; poster_path: string | null; popularity: number }) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? m.release_date.slice(0, 4) : "",
      posterPath: m.poster_path,
      mediaType: "movie" as const,
      popularity: m.popularity || 0,
    }),
  );

  const tvShows = (tvData.results || []).map(
    (t: { id: number; name: string; first_air_date?: string; poster_path: string | null; popularity: number }) => ({
      id: t.id,
      title: t.name,
      year: t.first_air_date ? t.first_air_date.slice(0, 4) : "",
      posterPath: t.poster_path,
      mediaType: "tv" as const,
      popularity: t.popularity || 0,
    }),
  );

  // Merge and sort by popularity, take top 15
  const results = [...movies, ...tvShows]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 15)
    .map(({ popularity, ...rest }) => rest);

  return NextResponse.json({ results });
}
