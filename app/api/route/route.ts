import { NextRequest, NextResponse } from "next/server";
import { DAY, cachedJson, rateLimit } from "@/lib/api-cache";
import { getGraph, tmdbCreditsSource } from "@/lib/solver/server";
import { routeFromAnyActor } from "@/lib/solver/bridge";

// The best route from any actor to the target: hint rung 2 and "Show me a route".
// Actors outside the graph (obscure credits) are bridged through TMDb.
//   /api/route?from=<actorId>&to=<targetId>
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const from = Number(params.get("from"));
  const to = Number(params.get("to"));
  if (!from || !to) return NextResponse.json({ error: "Missing from or to" }, { status: 400 });

  try {
    const route = await routeFromAnyActor(getGraph(), from, to, tmdbCreditsSource(process.env.TMDB_API_KEY ?? ""));
    if (!route) return NextResponse.json({ error: "No route from here" }, { status: 404 });
    return cachedJson({ route }, DAY);
  } catch {
    return NextResponse.json({ error: "Route lookup failed" }, { status: 503 });
  }
}
