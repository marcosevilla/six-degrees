"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameProvider, useGame } from "@/lib/GameContext";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { RevealScreen } from "@/components/screens/RevealScreen";
import { PlayingScreen } from "@/components/screens/PlayingScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import type { Difficulty } from "@/lib/types";
import type { Puzzle } from "@/lib/tmdb";

const DIFFICULTY_ACCENTS: Record<Difficulty, { hex: string; rgb: string }> = {
  easy: { hex: "#4ade80", rgb: "74, 222, 128" },
  medium: { hex: "#E8547C", rgb: "232, 84, 124" },
};

const DEFAULT_ACCENT = { hex: "#E63946", rgb: "230, 57, 70" };

interface GameContentProps {
  initialPuzzle?: Puzzle;
}

function GameContent({ initialPuzzle }: GameContentProps) {
  const { state, dispatch } = useGame();
  const autoStarted = useRef(false);
  // The shared pair is played once; Play Again deals fresh pairs after that.
  const [preset, setPreset] = useState<Puzzle | null>(initialPuzzle ?? null);
  const clearPreset = useCallback(() => setPreset(null), []);

  useEffect(() => {
    const accent = state.difficulty
      ? DIFFICULTY_ACCENTS[state.difficulty]
      : DEFAULT_ACCENT;
    document.documentElement.style.setProperty("--color-accent", accent.hex);
    document.documentElement.style.setProperty("--color-accent-rgb", accent.rgb);
  }, [state.difficulty]);

  // Share links arrive with a pair /api/puzzle already verified. They get the
  // same reveal as a dealt pair; difficulty follows the pair's par.
  useEffect(() => {
    if (initialPuzzle && !autoStarted.current) {
      autoStarted.current = true;
      dispatch({ type: "BEGIN_REVEAL", difficulty: initialPuzzle.par === 1 ? "easy" : "medium" });
    }
  }, [initialPuzzle, dispatch]);

  switch (state.phase) {
    case "home":
      return <HomeScreen />;
    case "revealing":
      return <RevealScreen presetPuzzle={preset} onStarted={clearPreset} />;
    case "playing":
      return <PlayingScreen />;
    case "results":
      return <ResultsScreen />;
  }
}

interface GameProps {
  initialPuzzle?: Puzzle;
}

export function Game({ initialPuzzle }: GameProps = {}) {
  return (
    <GameProvider>
      <GameContent initialPuzzle={initialPuzzle} />
    </GameProvider>
  );
}
