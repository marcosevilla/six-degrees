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

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Valid person ID required" }, { status: 400 });
  }

  const res = await fetch(
    `${TMDB_BASE}/person/${id}?api_key=${apiKey}`,
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const data = await res.json();

  return NextResponse.json({
    id: data.id,
    name: data.name,
    profilePath: data.profile_path,
  });
}
