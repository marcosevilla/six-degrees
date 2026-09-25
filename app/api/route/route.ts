import { NextRequest, NextResponse } from "next/server";
import { DAY, cachedJson, rateLimit } from "@/lib/api-cache";
import { getGraph, tmdbCreditsSource } from "@/lib/solver/server";
import { routeFromAnyActor, routeViaTitle } from "@/lib/solver/bridge";
import { toMediaType } from "@/lib/tmdb-rules";

// The best route from any actor to the target: hint rung 2 and "Show me a route".
// Actors outside the graph (obscure credits) are bridged through TMDb. With
// via=<titleId>&viaType=movie|tv the route must go through that title (the
// player already picked it and needs a costar from it).
//   /api/route?from=<actorId>&to=<targetId>[&via=<titleId>&viaType=movie&viaName=…]
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const from = Number(params.get("from"));
  const to = Number(params.get("to"));
  if (!from || !to) return NextResponse.json({ error: "Missing from or to" }, { status: 400 });

  try {
    const src = tmdbCreditsSource(process.env.TMDB_API_KEY ?? "");
    const via = Number(params.get("via"));
    const route = via
      ? await routeViaTitle(
          getGraph(),
          from,
          { id: via, name: params.get("viaName") ?? "", mediaType: toMediaType(params.get("viaType")), year: "", votes: 0 },
          to,
          src,
        )
      : await routeFromAnyActor(getGraph(), from, to, src);
    if (!route) return NextResponse.json({ error: "No route from here" }, { status: 404 });
    return cachedJson({ route }, DAY);
  } catch {
    return NextResponse.json({ error: "Route lookup failed" }, { status: 503 });
  }
}
