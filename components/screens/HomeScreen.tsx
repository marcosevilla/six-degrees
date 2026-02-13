"use client";

import { useState, useEffect } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchActorPool, getRandomPair } from "@/lib/actor-pool";
import { verifyPair } from "@/lib/tmdb";
import { PoolActor, Difficulty } from "@/lib/types";

const MAX_RETRIES = 8;

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; description: string; match: (minSteps: number | null) => boolean }
> = {
  easy: {
    label: "Easy",
    description: "They share a movie",
    match: (ms) => ms === 1,
  },
  medium: {
    label: "Medium",
    description: "One actor apart",
    match: (ms) => ms === 2,
  },
  hard: {
    label: "Hard",
    description: "No obvious connection",
    match: (ms) => ms === null,
  },
};

export function HomeScreen() {
  const { dispatch } = useGame();
  const [pool, setPool] = useState<PoolActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  useEffect(() => {
    fetchActorPool().then((actors) => {
      setPool(actors);
      setLoading(false);
    });
  }, []);

  const handlePlay = async () => {
    if (pool.length < 2) return;
    setStarting(true);

    const config = DIFFICULTY_CONFIG[difficulty];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const pair = getRandomPair(pool);
      const result = await verifyPair(pair.start.id, pair.end.id);

      if (config.match(result.minSteps)) {
        dispatch({ type: "START_GAME", pair, difficulty });
        return;
      }
    }

    // Fallback: start with whatever pair we get
    const pair = getRandomPair(pool);
    dispatch({ type: "START_GAME", pair, difficulty });
  };

  const disabled = loading || starting;

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
        disabled={disabled}
        className="px-8 md:px-10 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95 disabled:opacity-50"
        style={{
          background: "var(--color-accent)",
          color: "#fff",
          border: "none",
        }}
      >
        {loading ? "Loading..." : starting ? "Finding pair..." : "Play"}
      </button>
    </div>
  );
}
