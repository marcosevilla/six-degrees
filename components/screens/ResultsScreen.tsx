"use client";

import { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { elapsedMs, formatTime, getChainSteps, getScoreLabel, scoreVsPar } from "@/lib/scoring";
import { ChainDisplay } from "@/components/round/ChainDisplay";

export function ResultsScreen() {
  const { state, dispatch } = useGame();
  const { chain, actorPair, difficulty, hintsUsed } = state;
  const par = state.par ?? 0;
  const [copied, setCopied] = useState(false);

  const steps = getChainSteps(chain);
  const elapsed = elapsedMs(state, state.endTime ?? 0);
  const gaveUp = state.endReason === "gaveUp";
  const label = gaveUp ? "Gave up" : getScoreLabel(scoreVsPar(steps, hintsUsed, par));

  const shareText = actorPair
    ? `Six Degrees · Par ${par}\n${actorPair.start.name} → ${actorPair.end.name}: ${steps} step${steps !== 1 ? "s" : ""} · ${label}`
    : "";

  const shareUrl = actorPair
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/play?pair=${actorPair.start.id}-${actorPair.end.id}`
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

  // Same path as the first round: the reveal deals a verified pair.
  const handlePlayAgain = () => {
    dispatch({ type: "BEGIN_REVEAL", difficulty: difficulty ?? "medium" });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 md:gap-6 px-4 md:px-6 py-8 md:py-12 fade-in-up">
      {/* Difficulty + Score label */}
      {difficulty && (
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {difficulty} · Par {par}
        </p>
      )}
      <h1
        className="text-3xl md:text-4xl font-bold italic -mt-2 font-reveal"
        style={{ color: "var(--color-text)" }}
      >
        {label}
      </h1>

      {/* Stats: score is steps against par; hints count as steps; time only breaks ties */}
      <div className="flex gap-4 md:gap-8 items-center">
        <div className="text-center">
          <p className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
            {steps}
          </p>
          <p className="text-xs uppercase tracking-[0.15em]" style={{ color: "var(--color-text-secondary)" }}>
            {steps === 1 ? "Step" : "Steps"}
          </p>
        </div>
        <div className="w-px h-8" style={{ background: "var(--color-border)" }} />
        <div className="text-center">
          <p className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
            {par}
          </p>
          <p className="text-xs uppercase tracking-[0.15em]" style={{ color: "var(--color-text-secondary)" }}>
            Par
          </p>
        </div>
        {hintsUsed > 0 && (
          <>
            <div className="w-px h-8" style={{ background: "var(--color-border)" }} />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                +{hintsUsed}
              </p>
              <p className="text-xs uppercase tracking-[0.15em]" style={{ color: "var(--color-text-secondary)" }}>
                {hintsUsed === 1 ? "Hint" : "Hints"}
              </p>
            </div>
          </>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] tabular-nums -mt-2" style={{ color: "var(--color-text-secondary)" }}>
        Time {formatTime(elapsed)}
      </p>

      {/* Completed chain visualization */}
      {actorPair && !gaveUp && (
        <ChainDisplay
          chain={chain}
          currentSearchMode="media"
          targetActor={actorPair.end}
          isComplete={true}
          celebrate={false}
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
