// End-to-end smoke test for the TMDb proxy routes.
//
//   npx tsx scripts/smoke.ts                      # local dev on :3005
//   npx tsx scripts/smoke.ts https://<preview>.vercel.app
//
// Preview deployments sit behind Vercel Authentication. The project already
// has a Protection Bypass for Automation secret; `vercel curl --debug` prints
// it, so this pulls it into the env without echoing it:
//   export SMOKE_BYPASS=$(vercel curl /api/tmdb/person?id=287 --deployment <url> --yes --debug 2>&1 \
//     | grep -o 'x-vercel-protection-bypass: [A-Za-z0-9_-]*' | head -1 | awk '{print $2}')
//   npx tsx scripts/smoke.ts <url>

const base = (process.argv[2] ?? "http://localhost:3005").replace(/\/$/, "");
const bypass = process.env.SMOKE_BYPASS;

type Check = { name: string; run: () => Promise<void> };

async function get(path: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Non-JSON (the HTML page) stays as text.
  }
  return { status: res.status, body };
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function validate(actorId: number, mediaId: number, mediaType: "movie" | "tv") {
  const { status, body } = await get(
    `/api/tmdb/validate?actorId=${actorId}&mediaId=${mediaId}&mediaType=${mediaType}`,
  );
  assert(status === 200, `validate returned HTTP ${status}`);
  return body as { valid: boolean; reason?: string };
}

const checks: Check[] = [
  {
    name: "home page renders",
    run: async () => {
      const { status } = await get("/");
      assert(status === 200, `GET / returned HTTP ${status}`);
    },
  },
  {
    name: "pool returns at least 150 actors with photos",
    run: async () => {
      const { status, body } = await get("/api/tmdb/pool");
      assert(status === 200, `HTTP ${status}`);
      const actors = body.actors ?? [];
      assert(actors.length >= 150, `only ${actors.length} actors`);
      assert(
        actors.every((a: any) => a.id && a.name && a.profilePath),
        "an actor is missing id, name or profilePath",
      );
    },
  },
  {
    name: "pool snapshot is under 6 months old (TMDb caching limit)",
    run: async () => {
      const { body } = await get("/api/tmdb/pool");
      const ageDays = (Date.now() - Date.parse(body.generatedAt)) / 86_400_000;
      assert(Number.isFinite(ageDays), `no generatedAt (${body.generatedAt})`);
      assert(ageDays < 180, `pool is ${Math.round(ageDays)} days old; run npm run build:pool`);
    },
  },
  {
    name: "search finds Inception",
    run: async () => {
      const { body } = await get("/api/tmdb/search?query=inception&type=media");
      assert(
        body.results?.some((r: any) => r.id === 27205 && r.mediaType === "movie"),
        "Inception (movie 27205) not in results",
      );
    },
  },
  {
    name: "search hides talk shows and awards shows",
    run: async () => {
      const kimmel = await get("/api/tmdb/search?query=kimmel&type=media");
      assert(
        !kimmel.body.results?.some((r: any) => r.id === 1489 && r.mediaType === "tv"),
        "Jimmy Kimmel Live (tv 1489) is offered",
      );
      const oscars = await get("/api/tmdb/search?query=the%20oscars&type=media");
      assert(
        !oscars.body.results?.some((r: any) => r.id === 27023 && r.mediaType === "tv"),
        "The Oscars (tv 27023) is offered",
      );
    },
  },
  {
    name: "person search finds Leonardo DiCaprio",
    run: async () => {
      const { body } = await get("/api/tmdb/search?query=leonardo%20dicaprio&type=person");
      assert(body.results?.some((r: any) => r.id === 6193), "6193 not in results");
    },
  },
  {
    name: "person lookup returns Brad Pitt",
    run: async () => {
      const { status, body } = await get("/api/tmdb/person?id=287");
      assert(status === 200 && body.name === "Brad Pitt", `got ${status} ${body.name}`);
    },
  },
  {
    name: "credits for Inception include DiCaprio",
    run: async () => {
      const { body } = await get("/api/tmdb/credits?id=27205&type=movie");
      assert(body.cast?.some((c: any) => c.id === 6193), "6193 not in cast");
    },
  },
  {
    name: "validate rejects Brad Pitt on Jimmy Kimmel Live",
    run: async () => {
      const r = await validate(287, 1489, "tv");
      assert(r.valid === false, "Kimmel exploit is open");
    },
  },
  {
    name: "validate rejects Brad Pitt at The Oscars",
    run: async () => {
      const r = await validate(287, 27023, "tv");
      assert(r.valid === false, "awards-show exploit is open");
    },
  },
  {
    name: "validate rejects archive footage (Final Cut: Ladies and Gentlemen)",
    run: async () => {
      const r = await validate(6193, 126314, "movie");
      assert(r.valid === false, "archive-footage exploit is open");
    },
  },
  {
    name: "validate accepts DiCaprio in Inception",
    run: async () => {
      const r = await validate(6193, 27205, "movie");
      assert(r.valid === true, `rejected (${r.reason})`);
    },
  },
  {
    name: "validate accepts Bryan Cranston in Breaking Bad (TV)",
    run: async () => {
      const r = await validate(17419, 1396, "tv");
      assert(r.valid === true, `rejected (${r.reason})`);
    },
  },
  {
    name: "verify-pair: DiCaprio and Cillian Murphy are 1 step (Inception)",
    run: async () => {
      const { body } = await get("/api/tmdb/verify-pair?startId=6193&endId=2037");
      assert(body.connectable === true && body.minSteps === 1, JSON.stringify(body));
    },
  },
];

async function main() {
  console.log(`Smoke testing ${base}\n`);
  let failed = 0;
  for (const check of checks) {
    const started = Date.now();
    try {
      await check.run();
      console.log(`  ✓ ${check.name} (${Date.now() - started}ms)`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${check.name}\n      ${(err as Error).message}`);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
