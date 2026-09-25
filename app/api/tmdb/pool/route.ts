import { NextResponse } from "next/server";
import pool from "@/data/actor-pool.json";

// The pool is a committed snapshot (scripts/build-pool.ts), not a live TMDb
// query, so every server instance serves the same actors and a daily puzzle
// drawn from it is the same for everyone. Rebuild with `npm run build:pool`
// at least monthly; TMDb caps cached data at 6 months.
const actors = pool.actors.map(({ id, name, profilePath }) => ({
  id,
  name,
  profilePath,
}));

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    actors,
    count: actors.length,
    generatedAt: pool.generatedAt,
  });
}
