"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Game } from "@/components/Game";
import { fetchPerson } from "@/lib/tmdb";
import type { ActorPair, Difficulty } from "@/lib/types";

function PlayContent() {
  const searchParams = useSearchParams();
  const [pair, setPair] = useState<ActorPair | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pairParam = searchParams.get("pair");
  const difficultyParam = searchParams.get("d") as Difficulty | null;
  const difficulty: Difficulty =
    difficultyParam && ["easy", "medium", "hard"].includes(difficultyParam)
      ? difficultyParam
      : "medium";

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

    Promise.all([fetchPerson(startId), fetchPerson(endId)]).then(
      ([start, end]) => {
        if (!start || !end) {
          setError("Could not find one or both actors");
          return;
        }
        setPair({ start, end });
      }
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
        <a
          href="/"
          className="px-6 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          Play a random pair
        </a>
      </div>
    );
  }

  if (!pair) {
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

  return <Game initialPair={pair} initialDifficulty={difficulty} />;
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
