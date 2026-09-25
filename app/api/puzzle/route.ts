import { NextRequest, NextResponse } from "next/server";
import { DAY, cachedJson, rateLimit } from "@/lib/api-cache";
import { getGraph, getPool } from "@/lib/solver/server";
import { FAIR_MIN_VOTES, pickPuzzle } from "@/lib/solver/puzzle";
import { shortestRoute } from "@/lib/solver/search";

// Deals a verified pair with its par, or checks a shared pair. There is no
// fallback: a pair the graph can't connect is never handed out.
//   /api/puzzle?difficulty=easy|medium
//   /api/puzzle?start=<id>&target=<id>
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  let graph, pool;
  try {
    graph = getGraph();
    pool = getPool();
  } catch {
    return NextResponse.json({ error: "Puzzle data unavailable" }, { status: 503 });
  }
  const byId = new Map(pool.map((a) => [a.id, a]));
  const params = new URL(request.url).searchParams;

  if (params.has("start") || params.has("target")) {
    const startId = Number(params.get("start"));
    const targetId = Number(params.get("target"));
    const start = byId.get(startId);
    const target = byId.get(targetId);
    const par = start && target && startId !== targetId ? shortestRoute(graph, startId, targetId)?.par : undefined;
    if (!start || !target || !par) {
      return NextResponse.json({ error: "This pair can't be played" }, { status: 404 });
    }
    return cachedJson({ start, target, par }, DAY);
  }

  const difficulty = params.get("difficulty");
  if (difficulty !== "easy" && difficulty !== "medium") {
    return NextResponse.json({ error: "difficulty must be easy or medium" }, { status: 400 });
  }
  const pick = pickPuzzle(graph, pool.map((a) => a.id), difficulty, Math.random, 200, FAIR_MIN_VOTES);
  if (!pick) return NextResponse.json({ error: "No puzzle found" }, { status: 503 });
  return NextResponse.json(
    { start: byId.get(pick.startId), target: byId.get(pick.targetId), par: pick.par },
    { headers: { "Cache-Control": "no-store" } },
  );
}
