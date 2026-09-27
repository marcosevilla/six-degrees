"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/GameContext";
import {
  buildShareText,
  elapsedMs,
  formatTimecode,
  getChainSteps,
  scoreHeadline,
  scoreVsPar,
} from "@/lib/scoring";
import { CARD_RATIO, drawShareCard, shareCardBlob, type ShareCardData } from "@/lib/share-card";
import { REEL_MOTION } from "@/lib/motion";
import { ReelPlate } from "@/components/round/Reel";
import { LineSummary } from "@/components/round/LineSummary";

export function ResultsScreen() {
  const { state, dispatch } = useGame();
  const { chain, actorPair, difficulty, hintsUsed } = state;
  const par = state.par ?? 0;
  const [copied, setCopied] = useState(false);
  // Focus lands on the result, so screen readers read it and Tab goes to Share.
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headlineRef.current?.focus(), []);

  const steps = getChainSteps(chain);
  const elapsed = elapsedMs(state, state.endTime ?? 0);
  const gaveUp = state.endReason === "gaveUp";
  const delta = scoreVsPar(steps, hintsUsed, par);
  // Golf-style hub: +2, Par, −1.
  const hub = gaveUp ? "—" : delta === 0 ? "Par" : delta > 0 ? `+${delta}` : `−${-delta}`;

  const card: ShareCardData = { par, films: steps, hints: hintsUsed, score: gaveUp ? "Gave up" : hub };

  const shareUrl = actorPair
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/play?pair=${actorPair.start.id}-${actorPair.end.id}`
    : "";
  const shareText = buildShareText({ par, steps, hintsUsed, endReason: state.endReason ?? "won", url: shareUrl });

  // Like NYT Games: the share sheet on phones (with the card when the phone
  // takes files), the clipboard everywhere else.
  const handleShare = async () => {
    const isPhone = window.matchMedia("(pointer: coarse)").matches;
    if (isPhone && navigator.share) {
      try {
        const blob = await shareCardBlob(card);
        const files = blob ? [new File([blob], "six-degrees.png", { type: "image/png" })] : [];
        const data = files.length && navigator.canShare?.({ files, text: shareText }) ? { files, text: shareText } : { text: shareText };
        await navigator.share(data);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // they closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
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

  const summary = gaveUp
    ? `The express needs ${par}.`
    : delta < 0
      ? `You found a shorter line than the express we know (${par}).`
      : `${steps} film${steps === 1 ? "" : "s"}${hintsUsed > 0 ? ` and ${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}` : ""}. The express needs ${par}.`;

  return (
    <main
      className="results-in min-h-dvh flex flex-col md:flex-row md:items-center md:justify-center gap-10 md:gap-16 px-5 py-8 md:py-12"
      style={{ "--results-ms": `${REEL_MOTION.resultsSlideMs}ms`, "--results-ease": REEL_MOTION.resultsEasing } as React.CSSProperties}
    >
      <section className="w-full flex-1 md:flex-none md:max-w-[440px] flex flex-col gap-6">
        <div className="flex justify-between items-center text-sm text-text-secondary">
          <span className="capitalize">
            {difficulty} · Par {par}
          </span>
          <span className="font-mono text-xs tabular-nums" aria-label="Time">
            {formatTimecode(elapsed)}
          </span>
        </div>

        {/* The score sits in a reel's hub */}
        <div className="flex items-center gap-4">
          <div className="relative w-[88px] h-[88px] flex-none">
            <ReelPlate className="absolute inset-0 w-full h-full" />
            <span className="absolute left-1/2 top-1/2 w-[42px] h-[42px] -ml-[21px] -mt-[21px] rounded-full bg-bg grid place-items-center font-extrabold text-lg tabular-nums">
              {hub}
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 ref={headlineRef} tabIndex={-1} className="text-lg font-extrabold outline-none">
              {scoreHeadline(delta, gaveUp)}
            </h1>
            <p className="text-sm text-text-secondary text-pretty">{summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <LineSummary title={gaveUp ? "Your chain" : "Your line"} links={chain} emptyText="No links yet" />
          <LineSummary title={`Express (par ${par})`} links={state.bestRoute} express emptyText="Express unavailable" />
        </div>

        <div className="flex gap-2.5 mt-auto md:mt-2">
          <button
            onClick={handleShare}
            className="flex-1 min-h-12 rounded-md bg-cta-bg text-cta-fg font-extrabold transition-transform active:scale-[0.97]"
          >
            <span aria-live="polite">{copied ? "Copied!" : "Share"}</span>
          </button>
          <button
            onClick={handlePlayAgain}
            className="flex-1 min-h-12 rounded-md border-[1.5px] border-border font-semibold transition-transform active:scale-[0.97]"
          >
            Play again
          </button>
        </div>
      </section>

      {/* Wide screens: the share card, as it will look when posted */}
      <aside className="hidden md:flex flex-col gap-3 w-full max-w-[460px]">
        <h2 className="text-sm text-text-secondary">Share card</h2>
        <ShareCardPreview data={card} />
        <pre className="font-mono text-sm text-text-secondary whitespace-pre-wrap bg-surface rounded-md px-3.5 py-3">
          {shareText}
        </pre>
      </aside>
    </main>
  );
}

function ShareCardPreview({ data }: { data: ShareCardData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { par, films, hints, score } = data;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const w = canvas.clientWidth;
      const h = w / CARD_RATIO;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawShareCard(ctx, w, h, { par, films, hints, score });
    };
    document.fonts.ready.then(draw);
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [par, films, hints, score]);

  return (
    <canvas
      ref={ref}
      className="w-full rounded-md border border-divider"
      style={{ aspectRatio: CARD_RATIO }}
      role="img"
      aria-label={`Share card: par ${par}, ${films} film${films === 1 ? "" : "s"}, ${hints} hint${hints === 1 ? "" : "s"}, ${score}`}
    />
  );
}
