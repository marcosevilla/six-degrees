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
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {error}
        </p>
        <Link
          href="/"
          className="px-6 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          Play a new puzzle
        </Link>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p
          className="text-xs uppercase tracking-[0.2em] animate-pulse"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Loading challenge...
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
          <p
            className="text-xs uppercase tracking-[0.2em] animate-pulse"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Loading...
          </p>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
