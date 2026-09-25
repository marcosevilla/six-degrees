import { NextRequest, NextResponse } from "next/server";
import { DAY, cachedJson, rateLimit } from "@/lib/api-cache";
import { eligibleCredits } from "@/lib/solver/server";
import { byReach, toMediaType } from "@/lib/tmdb-rules";

// Hint rung 1: an actor's five best-known eligible titles.
//   /api/tmdb/filmography?id=<actorId>
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const credits = await eligibleCredits(process.env.TMDB_API_KEY ?? "", id);
    const films = credits
      .sort(byReach)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title ?? c.name ?? "",
        mediaType: toMediaType(c.media_type),
        year: (c.release_date ?? c.first_air_date ?? "").slice(0, 4),
        posterPath: c.poster_path ?? null,
      }));
    return cachedJson({ films }, DAY);
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
