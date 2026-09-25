"use client";

import { useState, useEffect } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchActorPool } from "@/lib/actor-pool";
import { Difficulty } from "@/lib/types";

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; description: string }
> = {
  easy: {
    label: "Easy",
    description: "They share a movie",
  },
  medium: {
    label: "Medium",
    description: "One actor apart",
  },
};

export function HomeScreen() {
  const { dispatch } = useGame();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // Pre-warm the actor pool cache (fire-and-forget)
  useEffect(() => {
    fetchActorPool();
  }, []);

  const handlePlay = () => {
    dispatch({ type: "BEGIN_REVEAL", difficulty });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 md:gap-10 px-6">
      <div className="text-center space-y-3">
        <p
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Connect any two actors
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          Six Degrees
        </h1>
      </div>

      <p
        className="text-sm text-center max-w-[280px] leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Build a chain of movies and actors to connect two random actors in as few steps as possible.
      </p>

      {/* Difficulty selector */}
      <div className="flex gap-2">
        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className="px-3 md:px-4 py-2 text-xs uppercase tracking-[0.1em] font-semibold transition-all"
            style={{
              background:
                difficulty === d ? "var(--color-accent)" : "transparent",
              color: difficulty === d ? "#fff" : "var(--color-text-secondary)",
              border:
                difficulty === d
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
            }}
          >
            {DIFFICULTY_CONFIG[d].label}
          </button>
        ))}
      </div>
      <p
        className="text-xs -mt-6"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {DIFFICULTY_CONFIG[difficulty].description}
      </p>

      <button
        onClick={handlePlay}
        className="px-8 md:px-10 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
        style={{
          background: "var(--color-accent)",
          color: "#fff",
          border: "none",
        }}
      >
        Play
      </button>

      {/* TMDb attribution, required by their API terms. The logo must stay less
          prominent than our own title, and must be one of their official SVGs. */}
      <footer className="flex items-center gap-2 max-w-[340px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img
          src="/tmdb-logo-short.svg"
          alt="TMDB"
          className="h-[12px] w-auto shrink-0"
        />
        <p className="text-[10px] leading-snug" style={{ color: "#8A8A8A" }}>
          This product uses TMDB and the TMDB APIs but is not endorsed,
          certified, or otherwise approved by TMDB.
        </p>
      </footer>
    </div>
  );
}
