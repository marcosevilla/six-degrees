"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Game } from "@/components/Game";
import { fetchPuzzleForPair, type Puzzle } from "@/lib/tmdb";

function PlayContent() {
  const searchParams = useSearchParams();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Difficulty comes from the pair's par, so an old ?d= param is ignored.
  const pairParam = searchParams.get("pair");

  useEffect(() => {
    if (!pairParam) {
      setError("No actor pair in URL");
      return;
    }

    const parts = pairParam.split("-");
    if (parts.length !== 2) {
      setError("Invalid pair format");
      return;
    }

    const [startId, endId] = parts.map(Number);
    if (isNaN(startId) || isNaN(endId)) {
      setError("Invalid actor IDs");
      return;
    }

    // The server checks the pair against the graph. A pair it can't connect
    // is refused, never swapped for a random one.
    fetchPuzzleForPair(startId, endId).then(
      (p) => (p ? setPuzzle(p) : setError("This link's puzzle can't be played.")),
      () => setError("Couldn't load this puzzle. Check your connection and try again."),
    );
  }, [pairParam]);

  if (error) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <p className="text-base text-text-secondary">{error}</p>
        <Link
          href="/"
          className="min-h-12 px-6 grid place-items-center rounded-md bg-cta-bg text-cta-fg font-extrabold transition-transform active:scale-[0.97]"
        >
          Play a new puzzle
        </Link>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-sm text-text-secondary" role="status">
          Loading the challenge…
        </p>
      </div>
    );
  }

  return <Game initialPuzzle={puzzle} />;
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <p className="text-sm text-text-secondary" role="status">
            Loading…
          </p>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
