"use client";

import { useEffect, useRef } from "react";
import { GameProvider, useGame } from "@/lib/GameContext";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { PlayingScreen } from "@/components/screens/PlayingScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import type { ActorPair, Difficulty } from "@/lib/types";

const DIFFICULTY_ACCENTS: Record<Difficulty, { hex: string; rgb: string }> = {
  easy: { hex: "#4ade80", rgb: "74, 222, 128" },
  medium: { hex: "#E8547C", rgb: "232, 84, 124" },
  hard: { hex: "#E63946", rgb: "230, 57, 70" },
};

const DEFAULT_ACCENT = { hex: "#E63946", rgb: "230, 57, 70" };

interface GameContentProps {
  initialPair?: ActorPair;
  initialDifficulty?: Difficulty;
}

function GameContent({ initialPair, initialDifficulty }: GameContentProps) {
  const { state, dispatch } = useGame();
  const autoStarted = useRef(false);

  useEffect(() => {
    const accent = state.difficulty
      ? DIFFICULTY_ACCENTS[state.difficulty]
      : DEFAULT_ACCENT;
    document.documentElement.style.setProperty("--color-accent", accent.hex);
    document.documentElement.style.setProperty("--color-accent-rgb", accent.rgb);
  }, [state.difficulty]);

  // Auto-start game when loaded via share link
  useEffect(() => {
    if (initialPair && !autoStarted.current) {
      autoStarted.current = true;
      dispatch({
        type: "START_GAME",
        pair: initialPair,
        difficulty: initialDifficulty ?? "medium",
      });
    }
  }, [initialPair, initialDifficulty, dispatch]);

  switch (state.phase) {
    case "home":
      return <HomeScreen />;
    case "playing":
      return <PlayingScreen />;
    case "results":
      return <ResultsScreen />;
  }
}

interface GameProps {
  initialPair?: ActorPair;
  initialDifficulty?: Difficulty;
}

export function Game({ initialPair, initialDifficulty }: GameProps = {}) {
  return (
    <GameProvider>
      <GameContent initialPair={initialPair} initialDifficulty={initialDifficulty} />
    </GameProvider>
  );
}
