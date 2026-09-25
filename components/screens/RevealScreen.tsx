"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useGame } from "@/lib/GameContext";
import { getProfileUrl } from "@/lib/actor-pool";
import { fetchPuzzle, type Puzzle } from "@/lib/tmdb";
import { playFlipSound } from "@/lib/sounds";
import type { ActorPair } from "@/lib/types";

type RevealPhase =
  | "loading"
  | "flip-left"
  | "flip-right"
  | "title"
  | "slide-out";

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
  const [slideActive, setSlideActive] = useState(false);
  const loadedCount = useRef(0);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

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

    const timeline: { p: RevealPhase; delay: number }[] = [
      { p: "flip-left", delay: 500 },
      { p: "flip-right", delay: 1500 },
      { p: "title", delay: 2500 },
      { p: "slide-out", delay: 4500 },
    ];

    const timers = timeline.map(({ p, delay }) =>
      setTimeout(() => {
        if (p === "flip-left" || p === "flip-right") {
          playFlipSound();
        }
        setPhase(p);
      }, delay),
    );

    // Dispatch START_GAME after slide completes
    const startTimer = setTimeout(() => {
      dispatch({ type: "START_GAME", pair, difficulty, par, now: Date.now() });
      onStarted?.();
    }, 5400);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(startTimer);
    };
  }, [pair, par, imagesReady, difficulty, dispatch, onStarted]);

  // --- Compute and apply slide transforms ---
  useLayoutEffect(() => {
    if (phase !== "slide-out") return;
    if (!leftRef.current || !rightRef.current) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = vw >= 768 ? 32 : 12;

    // Calculate where flex will place cards AFTER they shrink to 30dvh.
    // Both height and transform transitions use the same easing + duration,
    // so the intermediate positions track perfectly.
    const finalH = vh * 0.3; // 30dvh in px
    const finalW = finalH * 0.75; // aspect 3:4
    const gap = vw >= 768 ? 40 : 24; // md:gap-10 (2.5rem) : gap-6 (1.5rem)
    const totalW = 2 * finalW + gap;
    const futureLeftX = (vw - totalW) / 2;
    const futureRightX = futureLeftX + finalW + gap;

    // Deltas from future flex position to target edge positions
    const leftDelta = pad - futureLeftX;
    const rightDelta = (vw - pad - finalW) - futureRightX;

    // Apply after a frame so the browser registers the transition
    requestAnimationFrame(() => {
      if (leftRef.current) {
        leftRef.current.style.transform = `translateX(${leftDelta}px)`;
      }
      if (rightRef.current) {
        rightRef.current.style.transform = `translateX(${rightDelta}px)`;
      }
      setSlideActive(true);
    });
  }, [phase]);

  const leftRevealed = phase !== "loading";
  const rightRevealed = phase !== "loading" && phase !== "flip-left";
  const showTitle = phase === "title" || phase === "slide-out";
  const isSliding = phase === "slide-out";

  return (
    <div
      className="fixed inset-0 flex flex-col pb-24 md:pb-0"
      style={{ background: "var(--color-bg)", zIndex: 50 }}
    >
      {/* Header — matches ChainBuilder header */}
      <div
        className={`text-center pt-6 md:pt-12 pb-3 md:pb-4 transition-opacity duration-500 ${showTitle ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: "5rem" }}
      >
        {pair && (
          <>
            <p
              className="text-[10px] uppercase tracking-[0.2em] mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Connect
            </p>
            <h1
              className="text-lg md:text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {pair.start.name}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {" "}→{" "}
              </span>
              {pair.end.name}
            </h1>
          </>
        )}
      </div>

      {/* Top spacer — matches ChainBuilder */}
      <div className="flex-[0.3] md:flex-[0.8]" />

      {/* Cards — matches ChainDisplay vertical position */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-6 md:gap-10">
          <div
            ref={leftRef}
            style={{
              transition: isSliding
                ? "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          >
            <RevealCard
              actor={pair?.start ?? null}
              revealed={leftRevealed}
              flipping={phase === "flip-left"}
              floating={phase === "loading"}
              floatDelay={0}
              shrinking={slideActive}
            />
          </div>
          <div
            ref={rightRef}
            style={{
              transition: isSliding
                ? "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          >
            <RevealCard
              actor={pair?.end ?? null}
              revealed={rightRevealed}
              flipping={phase === "flip-right"}
              floating={phase === "loading"}
              floatDelay={0.4}
              shrinking={slideActive}
            />
          </div>
        </div>
      </div>

      {/* Bottom spacer — matches ChainBuilder */}
      <div className="flex-[0.3] md:flex-[0.8]" />

      {/* Bottom area — matches ChainBuilder reset button zone */}
      <div className="text-center mb-20 md:mb-2">
        {dealError ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Couldn&apos;t deal a pair.
            </p>
            <button
              onClick={() => {
                setDealError(false);
                setAttempt((n) => n + 1);
              }}
              className="px-8 py-3 text-sm uppercase tracking-[0.15em] font-semibold transition-all active:scale-95"
              style={{
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              Retry
            </button>
          </div>
        ) : phase === "loading" && (
          <p
            className="text-xs uppercase tracking-[0.2em] animate-pulse"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Shuffling actors...
          </p>
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
  shrinking: boolean;
}

function RevealCard({
  actor,
  revealed,
  flipping,
  floating,
  floatDelay,
  shrinking,
}: RevealCardProps) {
  const imgSrc =
    actor?.profilePath ? getProfileUrl(actor.profilePath, "w500") : "";

  return (
    <div
      style={{
        height: shrinking ? "30dvh" : "min(42dvh, 50vw)",
        aspectRatio: "3 / 4",
        perspective: "800px",
        transition: shrinking
          ? "height 800ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
      }}
    >
      <div
        className={`reveal-card-inner ${revealed ? "reveal-card-flipped" : ""}`}
        style={{
          transition: flipping ? "transform 500ms ease-out" : "none",
        }}
      >
        {/* Card back (face-down) */}
        <div className="reveal-card-face reveal-card-back">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              animation: floating
                ? `card-idle-float 2.5s ease-in-out ${floatDelay}s infinite`
                : "none",
            }}
          >
            <span
              className="text-5xl font-bold select-none"
              style={{ color: "var(--color-border)" }}
            >
              ?
            </span>
          </div>
        </div>

        {/* Card front (face-up) */}
        <div className="reveal-card-face reveal-card-front">
          <div
            className="w-full h-full overflow-hidden"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={actor?.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "var(--color-surface)" }}
              />
            )}
          </div>
          {actor && (
            <p
              className="text-[10px] md:text-xs font-medium uppercase tracking-[0.08em] text-center mt-2"
              style={{ color: "var(--color-text)" }}
            >
              {actor.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
