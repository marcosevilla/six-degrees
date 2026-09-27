"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChainLink, PoolActor } from "@/lib/types";
import { REEL_MOTION as M } from "@/lib/motion";
import { FilmStage } from "./film-stage";
import { ReelFace, ReelPlate } from "./Reel";
import { buildModel, STOCKS } from "@/lib/reel-model";

interface ReelStageProps {
  chain: ChainLink[];
  target: PoolActor;
  // The picked film has the target in it: tapping their reel closes the chain.
  targetReady: boolean;
  closing: boolean;
  // A pick is being checked against the current actor.
  pending: boolean;
  // Bumped on each rejected pick; the current reel shakes.
  shakeCount: number;
  onCloseChain?: () => void;
}

export function ReelStage({ chain, target, targetReady, closing, pending, shakeCount, onCloseChain }: ReelStageProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<FilmStage | null>(null);
  const colorsRef = useRef<string[]>([]);
  const mounted = useRef(false);
  const [coarse, setCoarse] = useState(false);

  const { stations, films } = useMemo(() => buildModel(chain, target), [chain, target]);
  const current = [...stations].reverse().find((s) => s.role !== "target")!;
  const signature = JSON.stringify([stations.map((s) => s.key), films.map((f) => [f.key, f.from, f.to])]);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useLayoutEffect(() => {
    const stage = new FilmStage(outerRef.current!, innerRef.current!, canvasRef.current!);
    const root = getComputedStyle(document.documentElement);
    colorsRef.current = STOCKS.map((v) => root.getPropertyValue(v).trim());
    stageRef.current = stage;
    return () => {
      stage.destroy();
      stageRef.current = null;
      mounted.current = false;
    };
  }, []);

  // Tell the stage what exists; it animates the difference.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setStations(stations.map((s) => s.key));
    const wanted = new Set(films.map((f) => f.key));
    for (const key of stage.keys()) if (!wanted.has(key)) stage.remove(key);
    for (const f of films) {
      if (!stage.has(f.key)) stage.add(f.key, f.from, f.to, colorsRef.current[f.stock], mounted.current);
      else if (stage.endOf(f.key) !== f.to) {
        if (f.to) stage.attach(f.key, f.to);
        else stage.detach(f.key);
      }
    }
    stage.kick();
    mounted.current = true;

    // Keep the actor you're working from in view.
    const outer = outerRef.current!;
    const p = stage.stationPoint(current.key);
    if (p) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      outer.scrollTo({
        top: Math.max(0, p.y - outer.clientHeight * 0.35),
        left: Math.max(0, p.x - outer.clientWidth * 0.5),
        behavior: reduce ? "auto" : "smooth",
      });
    }
    // `signature` captures everything the stage cares about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // The close: the film clips on, the target's reel clicks a sixth of a turn,
  // then every strip pulls taut and relaxes.
  const targetRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const click = setTimeout(() => {
      const svg = targetRef.current?.querySelector("svg");
      if (svg && !reduce) {
        svg.animate([{ transform: "rotate(0)" }, { transform: "rotate(60deg)" }], {
          duration: M.reelClickMs,
          easing: M.reelClickEasing,
          fill: "forwards",
        });
      }
    }, M.clipOnMs);
    const taut = setTimeout(() => stageRef.current?.tauten(), M.clipOnMs + M.clickToTautMs);
    return () => {
      clearTimeout(click);
      clearTimeout(taut);
    };
  }, [closing]);

  // Replay the shake on the current reel for every rejected pick.
  const shakeRefs = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => {
    if (shakeCount === 0) return;
    const el = shakeRefs.current.get(current.key);
    if (!el) return;
    el.classList.remove("input-shake");
    void el.offsetWidth;
    el.classList.add("input-shake");
    // Only a new rejection should shake, not a change of current actor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeCount]);

  const openFilm = films.at(-1)?.to === null ? films.at(-1)!.link.name : null;
  const verb = coarse ? "Tap" : "Click";

  return (
    <div
      ref={outerRef}
      className="relative flex-1 min-h-0 overflow-auto scrollbar-hide"
      style={{ "--clip-ms": `${M.clipOnMs}ms`, "--ready-ms": `${M.readyPulseMs}ms` } as React.CSSProperties}
    >
      <div ref={innerRef} className="relative">
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />

        {stations.map((s) => {
          const isTarget = s.role === "target";
          const state = isTarget
            ? closing
              ? "closed"
              : targetReady
                ? "ready"
                : "waiting"
            : s.key === current.key && pending
              ? "pending"
              : "";
          const body = (
            <div
              ref={(el) => {
                if (el) shakeRefs.current.set(s.key, el);
                else shakeRefs.current.delete(s.key);
              }}
              className="reel-body"
            >
              <ReelPlate />
              <ReelFace name={s.name} profilePath={s.profilePath} />
              <span className="reel-name">
                {s.name}
                {state === "ready" && <span className="reel-tap">{verb} to connect</span>}
                {state === "pending" && <span className="reel-tap">Checking…</span>}
              </span>
            </div>
          );
          return isTarget ? (
            <button
              key={s.key}
              ref={targetRef}
              type="button"
              data-station={s.key}
              className={`reel ${state}`}
              disabled={state !== "ready"}
              onClick={onCloseChain}
              aria-label={state === "ready" && openFilm ? `Connect ${s.name} through ${openFilm}` : s.name}
            >
              {body}
            </button>
          ) : (
            <div key={s.key} data-station={s.key} className={`reel ${state} ${s.role === "start" ? "" : "reel-in"}`}>
              {body}
            </div>
          );
        })}

        {films.map((f) => (
          <div key={f.key} data-film-label={f.key} className="film-label">
            <b>{f.link.name}</b>
            <span className="font-mono">
              {f.link.mediaType === "tv" ? "TV " : ""}
              {f.link.year}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
