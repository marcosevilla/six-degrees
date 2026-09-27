"use client";

import { useState, useEffect, useRef } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchActorPool } from "@/lib/actor-pool";
import { Difficulty } from "@/lib/types";
import { ExampleLine } from "@/components/round/ExampleLine";

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; description: string }> = {
  easy: { label: "Easy", description: "They share a movie or show" },
  medium: { label: "Medium", description: "One actor apart" },
};
const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];

export function HomeScreen() {
  const { dispatch } = useGame();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  // Pre-warm the actor pool cache (fire-and-forget)
  useEffect(() => {
    fetchActorPool();
  }, []);

  const handlePlay = () => {
    dispatch({ type: "BEGIN_REVEAL", difficulty });
  };

  // Radio group keys: arrows move the choice (and focus) between options.
  const onRadioKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + DIFFICULTIES.length) % DIFFICULTIES.length;
    setDifficulty(DIFFICULTIES[next]);
    radios.current[next]?.focus();
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-text-secondary">Connect any two actors</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Six Degrees</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <ExampleLine />
        <p className="text-base text-text-secondary max-w-[300px] text-center text-pretty">
          Actors in the same movie or show are one film apart. Link your pair in as few films as you can.
        </p>
      </div>

      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <div role="radiogroup" aria-label="Difficulty" className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map((d, i) => {
            const checked = difficulty === d;
            return (
              <button
                key={d}
                ref={(el) => {
                  radios.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => setDifficulty(d)}
                onKeyDown={(e) => onRadioKey(e, i)}
                className={`min-h-16 rounded-md border-[1.5px] px-3 py-2 flex flex-col items-start justify-center gap-0.5 text-left transition-[border-color,background-color] duration-150 ${
                  checked ? "border-accent bg-surface" : "border-border hover:bg-surface"
                }`}
              >
                <span className="text-md font-extrabold">{DIFFICULTY_CONFIG[d].label}</span>
                <span className="text-xs text-text-secondary">{DIFFICULTY_CONFIG[d].description}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handlePlay}
          className="w-full min-h-12 rounded-md bg-cta-bg text-cta-fg font-extrabold text-base transition-transform active:scale-[0.97]"
        >
          Play
        </button>
      </div>

      {/* TMDb attribution, required by their API terms. The logo must stay less
          prominent than our own title, and must be one of their official SVGs. */}
      <footer className="flex items-center gap-2 max-w-[340px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/tmdb-logo-short.svg" alt="TMDB" className="h-[12px] w-auto shrink-0" />
        <p className="text-2xs text-text-secondary">
          This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
        </p>
      </footer>
    </main>
  );
}
