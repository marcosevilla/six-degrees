import { NextRequest, NextResponse } from "next/server";
import {
  TMDB_BASE,
  CastMember,
  castMemberActs,
  isAwardsShow,
  isEligibleTitle,
  toMediaType,
} from "@/lib/tmdb-rules";

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
  const mediaTypeParam = searchParams.get("mediaType"); // "movie" | "tv"

  if (!actorId || !mediaId || !mediaTypeParam) {
    return NextResponse.json(
      { error: "Missing actorId, mediaId, or mediaType parameter" },
      { status: 400 }
    );
  }

  const mediaType = toMediaType(mediaTypeParam);
  const castKey = mediaType === "tv" ? "aggregate_credits" : "credits";

  // One call returns the title's genres and its cast together.
  const res = await fetch(
    `${TMDB_BASE}/${mediaType}/${mediaId}?api_key=${apiKey}&append_to_response=${castKey}`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { valid: false, reason: "lookup_failed" },
      { status: 502 },
    );
  }
  const data = await res.json();

  const genreIds: number[] = (data.genres || []).map((g: { id: number }) => g.id);
  if (!isEligibleTitle(genreIds) || isAwardsShow(mediaType, data.name)) {
    return NextResponse.json({ valid: false, reason: "excluded_title" });
  }

  const cast: CastMember[] = data[castKey]?.cast || [];
  const actorIdNum = parseInt(actorId, 10);
  const member = cast.find((c) => c.id === actorIdNum);

  if (!member) {
    return NextResponse.json({ valid: false, reason: "not_in_cast" });
  }
  if (!castMemberActs(member)) {
    return NextResponse.json({ valid: false, reason: "not_acting_role" });
  }

  return NextResponse.json({ valid: true });
}
