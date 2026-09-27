"use client";

import { useState, useEffect, useRef } from "react";
import { useGame } from "@/lib/GameContext";
import { getProfileUrl } from "@/lib/actor-pool";
import { fetchPuzzle, type Puzzle } from "@/lib/tmdb";
import { playFlipSound } from "@/lib/sounds";
import { REVEAL_MOTION as M, revealStartMs } from "@/lib/motion";
import { ReelPlate } from "@/components/round/Reel";
import type { ActorPair } from "@/lib/types";

type RevealPhase = "loading" | "flip-left" | "flip-right" | "title" | "exit";

interface RevealScreenProps {
  // A shared pair that /api/puzzle already verified; skips dealing a new one.
  presetPuzzle?: Puzzle | null;
  onStarted?: () => void;
}

export function RevealScreen({ presetPuzzle = null, onStarted }: RevealScreenProps) {
  const { state, dispatch } = useGame();
  const difficulty = state.difficulty ?? "medium";

  const [pair, setPair] = useState<ActorPair | null>(null);
  const [par, setPar] = useState<number | null>(null);
  const [dealError, setDealError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>("loading");
  const [imagesReady, setImagesReady] = useState(false);
  const loadedCount = useRef(0);

  // --- Deal a verified pair (the server solves par; no unverified fallback) ---
  useEffect(() => {
    let cancelled = false;
    const deal = presetPuzzle ? Promise.resolve(presetPuzzle) : fetchPuzzle(difficulty);
    deal.then(
      (p) => {
        if (cancelled) return;
        setPair({ start: p.start, end: p.target });
        setPar(p.par);
      },
      () => {
        if (!cancelled) setDealError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [difficulty, presetPuzzle, attempt]);

  // --- Preload images once pair is found ---
  useEffect(() => {
    if (!pair) return;

    const urls = [
      pair.start.profilePath ? getProfileUrl(pair.start.profilePath, "w500") : null,
      pair.end.profilePath ? getProfileUrl(pair.end.profilePath, "w500") : null,
    ];

    const needed = urls.filter(Boolean).length;
    if (needed === 0) {
      setImagesReady(true);
      return;
    }

    loadedCount.current = 0;
    urls.forEach((url) => {
      if (!url) return;
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount.current++;
        if (loadedCount.current >= needed) {
          setImagesReady(true);
        }
      };
      img.src = url;
    });
  }, [pair]);

  // --- Animation sequence ---
  useEffect(() => {
    if (!pair || par === null || !imagesReady) return;

    const timeline: { p: RevealPhase; at: number }[] = [
      { p: "flip-left", at: M.flipLeftAt },
      { p: "flip-right", at: M.flipRightAt },
      { p: "title", at: M.titleAt },
      { p: "exit", at: M.exitAt },
    ];

    const timers = timeline.map(({ p, at }) =>
      setTimeout(() => {
        if (p === "flip-left" || p === "flip-right") playFlipSound();
        setPhase(p);
      }, at),
    );

    // The playing screen's reels arrive as the cards finish fading.
    const startTimer = setTimeout(() => {
      dispatch({ type: "START_GAME", pair, difficulty, par, now: Date.now() });
      onStarted?.();
    }, revealStartMs());

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(startTimer);
    };
  }, [pair, par, imagesReady, difficulty, dispatch, onStarted]);

  const leftRevealed = phase !== "loading";
  const rightRevealed = phase !== "loading" && phase !== "flip-left";
  const showTitle = phase === "title" || phase === "exit";
  const exiting = phase === "exit";

  return (
    <div
      className="fixed inset-0 z-50 bg-bg flex flex-col"
      style={
        {
          "--flip-ms": `${M.flipMs}ms`,
          "--title-ms": `${M.titleFadeMs}ms`,
          "--exit-ms": `${M.exitMs}ms`,
          "--float-ms": `${M.idleFloatMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* Header: same place as the playing screen's */}
      <header
        className={`flex flex-col gap-1.5 px-5 md:px-8 pt-5 md:pt-8 w-full md:max-w-[1120px] md:mx-auto min-h-24 transition-opacity duration-[var(--title-ms)] ${
          showTitle ? "opacity-100" : "opacity-0"
        }`}
      >
        {pair && (
          <>
            <p className="text-sm text-text-secondary capitalize">
              {difficulty}
              {par !== null && ` · Par ${par}`}
            </p>
            <h1 className="text-xl font-extrabold tracking-[-0.01em] text-balance">
              {pair.start.name} to {pair.end.name}
            </h1>
          </>
        )}
      </header>

      {/* The two cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`flex items-center gap-6 md:gap-10 ${exiting ? "reveal-exit" : ""}`}>
          <RevealCard actor={pair?.start ?? null} revealed={leftRevealed} flipping={phase === "flip-left"} floating={phase === "loading"} floatDelay={0} />
          <RevealCard actor={pair?.end ?? null} revealed={rightRevealed} flipping={phase === "flip-right"} floating={phase === "loading"} floatDelay={0.4} />
        </div>
      </div>

      <div className="min-h-24 flex items-start justify-center px-5">
        {dealError ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-base text-text-secondary">Couldn&apos;t deal a pair.</p>
            <button
              onClick={() => {
                setDealError(false);
                setAttempt((n) => n + 1);
              }}
              className="min-h-12 px-8 rounded-md border-[1.5px] border-border font-semibold transition-transform active:scale-[0.97]"
            >
              Retry
            </button>
          </div>
        ) : (
          phase === "loading" && (
            <p className="text-sm text-text-secondary" role="status">
              Shuffling actors…
            </p>
          )
        )}
      </div>
    </div>
  );
}

// --- RevealCard sub-component ---

interface RevealCardProps {
  actor: { name: string; profilePath?: string | null } | null;
  revealed: boolean;
  flipping: boolean;
  floating: boolean;
  floatDelay: number;
}

// Face down: a reel on a blank card. Face up: the actor.
function RevealCard({ actor, revealed, flipping, floating, floatDelay }: RevealCardProps) {
  const imgSrc = actor?.profilePath ? getProfileUrl(actor.profilePath, "w500") : "";

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ height: "min(42dvh, 44vw)", aspectRatio: "3 / 4", perspective: "800px" }}>
        <div
          className={`reveal-card-inner ${revealed ? "reveal-card-flipped" : ""}`}
          style={{ transition: flipping ? "transform var(--flip-ms) ease-out" : "none" }}
        >
          <div className="reveal-card-face reveal-card-back">
            <div
              className="w-full h-full grid place-items-center rounded-md bg-surface border border-divider"
              style={{ animation: floating ? `card-idle-float var(--float-ms) ease-in-out ${floatDelay}s infinite` : "none" }}
            >
              <ReelPlate className="w-1/2 h-auto opacity-40 [&_.reel-plate]:fill-reel-dim [&_.reel-cut]:fill-surface" />
            </div>
          </div>

          <div className="reveal-card-face reveal-card-front">
            <div className="w-full h-full overflow-hidden rounded-md outline outline-1 -outline-offset-1 outline-white/10 bg-surface">
              {imgSrc && (
                // eslint-disable-next-line @next/next/no-img-element -- preloaded TMDb image
                <img src={imgSrc} alt={actor?.name ?? ""} className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        </div>
      </div>
      <p className={`text-md font-extrabold text-center transition-opacity duration-[var(--flip-ms)] ${revealed && actor ? "opacity-100" : "opacity-0"}`}>
        {actor?.name ?? " "}
      </p>
    </div>
  );
}
