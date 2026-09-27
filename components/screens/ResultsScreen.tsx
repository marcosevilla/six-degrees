"use client";

import { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { buildShareText, elapsedMs, formatTime, getChainSteps, getScoreLabel, scoreVsPar } from "@/lib/scoring";
import { ChainDisplay } from "@/components/round/ChainDisplay";
import { RouteList } from "@/components/round/RouteList";

export function ResultsScreen() {
  const { state, dispatch } = useGame();
  const { chain, actorPair, difficulty, hintsUsed } = state;
  const par = state.par ?? 0;
  const [copied, setCopied] = useState(false);

  const steps = getChainSteps(chain);
  const elapsed = elapsedMs(state, state.endTime ?? 0);
  const gaveUp = state.endReason === "gaveUp";
  const delta = scoreVsPar(steps, hintsUsed, par);
  const label = gaveUp ? "Gave up" : getScoreLabel(delta);

  const shareUrl = actorPair
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/play?pair=${actorPair.start.id}-${actorPair.end.id}`
    : "";

  // Like NYT Games: the share sheet on phones, the clipboard everywhere else.
  const handleShare = async () => {
    const text = buildShareText({ par, steps, hintsUsed, endReason: state.endReason ?? "won", url: shareUrl });
    const isPhone = window.matchMedia("(pointer: coarse)").matches;
    if (isPhone && navigator.share && navigator.canShare?.({ text }) !== false) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // they closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: nothing to fall back to without a prompt.
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
        className="text-2xl font-extrabold -mt-2"
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

      {/* Your route against the best route we know */}
      <div className="grid grid-cols-2 gap-6 md:gap-10 w-full max-w-[560px] px-2">
        <RouteList
          title={gaveUp ? `Your chain (${steps})` : `Your route (${steps})`}
          links={chain}
          emptyText="No links yet"
        />
        <RouteList title={`Best route (par ${par})`} links={state.bestRoute} emptyText="Best route unavailable" />
      </div>
      {!gaveUp && delta < 0 && (
        <p className="text-xs text-center max-w-[320px]" style={{ color: "var(--color-text-secondary)" }}>
          You found a shorter route than the best one we know.
        </p>
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
