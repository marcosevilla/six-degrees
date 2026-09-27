"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameProvider, useGame } from "@/lib/GameContext";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { RevealScreen } from "@/components/screens/RevealScreen";
import { PlayingScreen } from "@/components/screens/PlayingScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import type { Puzzle } from "@/lib/tmdb";

interface GameContentProps {
  initialPuzzle?: Puzzle;
}

function GameContent({ initialPuzzle }: GameContentProps) {
  const { state, dispatch } = useGame();
  const autoStarted = useRef(false);
  // The shared pair is played once; Play Again deals fresh pairs after that.
  const [preset, setPreset] = useState<Puzzle | null>(initialPuzzle ?? null);
  const clearPreset = useCallback(() => setPreset(null), []);

  // Share links arrive with a pair /api/puzzle already verified. They get the
  // same reveal as a dealt pair; difficulty follows the pair's par.
  useEffect(() => {
    if (initialPuzzle && !autoStarted.current) {
      autoStarted.current = true;
      dispatch({ type: "BEGIN_REVEAL", difficulty: initialPuzzle.par === 1 ? "easy" : "medium" });
    }
  }, [initialPuzzle, dispatch]);

  const screen = (() => {
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
  })();

  // Phase changes, read out for screen readers (results focuses its headline).
  const phaseMessage =
    state.phase === "revealing"
      ? "Dealing a pair."
      : state.phase === "playing" && state.actorPair
        ? `Connect ${state.actorPair.start.name} to ${state.actorPair.end.name}. Par ${state.par}.`
        : "";

  return (
    <>
      {screen}
      <p aria-live="polite" className="sr-only-live">
        {phaseMessage}
      </p>
    </>
  );
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
