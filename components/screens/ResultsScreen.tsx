"use client";

import { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { getChainSteps, formatTime, getScoreLabel } from "@/lib/scoring";
import { fetchActorPool, getRandomPair } from "@/lib/actor-pool";
import { verifyPair } from "@/lib/tmdb";
import { ChainDisplay } from "@/components/round/ChainDisplay";

const MAX_RETRIES = 5;

export function ResultsScreen() {
  const { state, dispatch } = useGame();
  const { chain, actorPair, startTime, endTime, difficulty } = state;
  const [copied, setCopied] = useState(false);

  const steps = getChainSteps(chain.length);
  const elapsed = startTime && endTime ? endTime - startTime : 0;
  const label = getScoreLabel(steps);

  const shareText = actorPair
    ? `I connected ${actorPair.start.name} to ${actorPair.end.name} in ${steps} step${steps !== 1 ? "s" : ""}! Can you beat me? 🎬`
    : "";

  const shareUrl = actorPair
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/play?pair=${actorPair.start.id}-${actorPair.end.id}${difficulty ? `&d=${difficulty}` : ""}`
    : "";

  const handleShare = async () => {
    const text = `${shareText}\n${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayAgain = async () => {
    const pool = await fetchActorPool();
    const diff = difficulty ?? "medium";
    const matchFn =
      diff === "easy"
        ? (ms: number | null) => ms === 1
        : diff === "medium"
          ? (ms: number | null) => ms === 2
          : (ms: number | null) => ms === null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const pair = getRandomPair(pool);
      const result = await verifyPair(pair.start.id, pair.end.id);
      if (matchFn(result.minSteps)) {
        dispatch({ type: "PLAY_AGAIN" });
        dispatch({ type: "START_GAME", pair, difficulty: diff });
        return;
      }
    }
    // Fallback
    const pair = getRandomPair(pool);
    dispatch({ type: "PLAY_AGAIN" });
    dispatch({ type: "START_GAME", pair, difficulty: diff });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 md:gap-6 px-4 md:px-6 py-8 md:py-12">
      {/* Difficulty + Score label */}
      {difficulty && (
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {difficulty}
        </p>
      )}
      <h1
        className="text-3xl md:text-4xl font-bold italic -mt-2 font-reveal"
        style={{ color: "var(--color-text)" }}
      >
        {label}
      </h1>

      {/* Stats */}
      <div className="flex gap-4 md:gap-8 items-center">
        <div className="text-center">
          <p
            className="text-2xl md:text-3xl font-bold"
            style={{ color: "var(--color-accent)" }}
          >
            {steps}
          </p>
          <p
            className="text-xs uppercase tracking-[0.15em]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {steps === 1 ? "Step" : "Steps"}
          </p>
        </div>
        <div
          className="w-px h-8"
          style={{ background: "var(--color-border)" }}
        />
        <div className="text-center">
          <p
            className="text-2xl md:text-3xl font-bold"
            style={{ color: "var(--color-accent)" }}
          >
            {formatTime(elapsed)}
          </p>
          <p
            className="text-xs uppercase tracking-[0.15em]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Time
          </p>
        </div>
      </div>

      {/* Completed chain visualization */}
      {actorPair && (
        <ChainDisplay
          chain={chain}
          currentSearchMode="media"
          targetActor={actorPair.end}
          isComplete={true}
        />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center w-full sm:w-auto px-6 sm:px-0">
        <button
          onClick={handleShare}
          className="w-full sm:w-auto px-8 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
          style={{
            background: "var(--color-accent)",
            color: "#fff",
          }}
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          onClick={handlePlayAgain}
          className="w-full sm:w-auto px-8 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
          style={{
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
