"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchRoute, validateConnection } from "@/lib/tmdb";
import { routeToLinks } from "@/lib/route-links";
import { closeBeatMs, REEL_MOTION } from "@/lib/motion";
import { ChainLink, MediaResult, PersonResult } from "@/lib/types";
import { CHAIN_SOFT_LIMIT } from "@/lib/actor-pool";
import { elapsedMs, formatTimecode } from "@/lib/scoring";
import { playCardSound, playWinSound, playRemoveSound, playErrorSound } from "@/lib/sounds";
import { SearchInput } from "./SearchInput";
import { ReelStage } from "./ReelStage";
import { HintLadder } from "./HintLadder";

export function ChainBuilder() {
  const { state, dispatch } = useGame();
  const { chain, searchMode, selectedMedia, actorPair, difficulty, par } = state;

  const [error, setError] = useState<string | null>(null);
  // Bumped on every rejected pick so the shake replays even for the same message.
  const [errorCount, setErrorCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  // Read out by screen readers: what a pick did and what to do next.
  const [announcement, setAnnouncement] = useState("");
  const [now, setNow] = useState(() => Date.now());
  // The picked film whose cast includes the target (checked alongside the pick).
  const [reachableMediaId, setReachableMediaId] = useState<number | null>(null);
  const closing = state.closing;

  const currentActor = chain.length > 0 ? chain[chain.length - 1] : null;
  // The actor the player is working from (the chain may end on a picked film).
  const lastActor = [...chain].reverse().find((l) => l.type === "actor") ?? null;

  // Live clock. elapsedMs leaves out time spent waiting on validation.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = elapsedMs(state, now);

  // Restart the shake on each rejection without remounting the input (a
  // remount would drop focus and close the phone keyboard).
  const shakeRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (errorCount === 0) return;
    for (const el of shakeRefs.current) {
      if (!el) continue;
      el.classList.remove("input-shake");
      void el.offsetWidth;
      el.classList.add("input-shake");
    }
  }, [errorCount]);

  // Keyboard and mouse players start typing straight away. Phones don't:
  // the keyboard would cover the line.
  const searchRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.querySelector("input")?.focus();
  }, []);

  const reject = (message: string) => {
    playErrorSound();
    setError(message);
    setErrorCount((n) => n + 1);
  };

  // Every TMDb check runs with the clock paused: the player shouldn't pay for
  // network time. Several people can be checked against one title at once.
  const checkLinks = async (media: MediaResult, actorIds: number[]) => {
    setError(null);
    setIsValidating(true);
    dispatch({ type: "PAUSE_TIMER", now: Date.now() });
    try {
      return await Promise.all(actorIds.map((id) => validateConnection(id, media.id, media.mediaType)));
    } finally {
      dispatch({ type: "RESUME_TIMER", now: Date.now() });
      setIsValidating(false);
    }
  };

  // --- Closing the chain: tap the target, play the beat, then results ---
  const finishRef = useRef<{ timer: ReturnType<typeof setTimeout>; route: Promise<ChainLink[] | null>; done: boolean } | null>(null);

  const finish = useCallback(async () => {
    const pending = finishRef.current;
    if (!pending || pending.done) return;
    pending.done = true;
    clearTimeout(pending.timer);
    dispatch({ type: "FINISH", bestRoute: await pending.route });
  }, [dispatch]);

  useEffect(() => () => clearTimeout(finishRef.current?.timer), []);

  const closeChain = (mediaId: number) => {
    if (!actorPair || closing || finishRef.current || selectedMedia?.id !== mediaId) return;
    dispatch({ type: "CLOSE_CHAIN", now: Date.now(), mediaId });
    playWinSound();
    setAnnouncement("Chain closed.");
    // The best route for results loads during the beat (graph-only, ~ms).
    const route = fetchRoute(actorPair.start.id, actorPair.end.id)
      .then((r) => (r ? routeToLinks(r) : null))
      .catch(() => null);
    const timer = setTimeout(finish, closeBeatMs());
    finishRef.current = { timer, route, done: false };
  };
  const showSoftLimit = chain.length >= CHAIN_SOFT_LIMIT;

  const excludeActorIds = useMemo(
    () => chain.filter((l) => l.type === "actor").map((l) => l.id),
    [chain],
  );

  const handleSelectMedia = async (media: MediaResult) => {
    if (!currentActor || !actorPair) return;
    try {
      // Also ask whether the target is in this title, so their card can light
      // up the moment the film is placed.
      const [valid, reachesTarget] = await checkLinks(media, [currentActor.id, actorPair.end.id]);
      if (!valid) {
        reject(`${currentActor.name} doesn't appear in ${media.title}`);
        return;
      }
      playCardSound();
      setAnnouncement(
        reachesTarget
          ? `${media.title} added. ${actorPair.end.name} is in it: pick them to close the chain.`
          : `${media.title} added. Who else was in it?`,
      );
      setReachableMediaId(reachesTarget ? media.id : null);
      dispatch({ type: "SELECT_MEDIA", media, fromActorId: currentActor.id });
    } catch {
      reject("Connection failed — check your internet and try again");
    }
  };

  const handleSelectPerson = async (person: PersonResult) => {
    if (!selectedMedia || !actorPair) return;
    const isTarget = person.id === actorPair.end.id;
    // Typing the target's name works like tapping their card.
    if (isTarget && reachableMediaId === selectedMedia.id) {
      closeChain(selectedMedia.id);
      return;
    }
    try {
      const [valid] = await checkLinks(selectedMedia, [person.id]);
      if (!valid) {
        reject(`${person.name} doesn't appear in ${selectedMedia.title}`);
        return;
      }
      if (isTarget) {
        closeChain(selectedMedia.id);
        return;
      }
      playCardSound();
      setAnnouncement(`${person.name} added. What was ${person.name} in?`);
      dispatch({ type: "SELECT_PERSON", person, mediaId: selectedMedia.id });
    } catch {
      reject("Connection failed — check your internet and try again");
    }
  };

  const targetReachable =
    searchMode === "person" && selectedMedia !== null && reachableMediaId === selectedMedia.id;

  const hintLadder =
    actorPair && lastActor && !closing ? (
      <HintLadder
        currentActor={lastActor}
        start={actorPair.start}
        target={actorPair.end}
        onPickFilm={handleSelectMedia}
        disabled={isValidating}
      />
    ) : null;

  const placeholder =
    searchMode === "media"
      ? `What was ${currentActor?.name} in?`
      : `Who else was in ${selectedMedia?.title}?`;

  const undo = () => {
    if (isValidating) return;
    playRemoveSound();
    dispatch({ type: "UNDO_LAST" });
    setAnnouncement("Removed the last pick.");
    setError(null);
  };

  const startOver = () => {
    playRemoveSound();
    dispatch({ type: "RESET_CHAIN", now: Date.now() });
    setAnnouncement("Chain cleared. The clock restarted.");
    setError(null);
  };

  return (
    // While the chain closes, a tap anywhere skips to results.
    <div
      className="flex flex-col w-full h-dvh"
      onClick={closing ? finish : undefined}
      style={{ "--shake-ms": `${REEL_MOTION.shakeMs}ms` } as React.CSSProperties}
    >
      {/* Header: difficulty, par, hints, the clock, then who to connect */}
      <header className="flex flex-col gap-1.5 px-5 md:px-8 pt-5 md:pt-8 pb-1 w-full md:max-w-[1120px] md:mx-auto">
        <div className="flex justify-between items-center text-sm text-text-secondary">
          <span>
            <span className="capitalize">{difficulty}</span>
            {par !== null && ` · Par ${par}`}
            {state.hintsUsed > 0 && ` · ${state.hintsUsed} hint${state.hintsUsed === 1 ? "" : "s"}`}
          </span>
          <span className="font-mono text-xs tabular-nums" aria-label="Time">
            {formatTimecode(elapsed)}
          </span>
        </div>
        {actorPair && (
          <h1 className="text-xl font-extrabold tracking-[-0.01em] text-balance">
            {actorPair.start.name} to {actorPair.end.name}
          </h1>
        )}
      </header>

      {/* The line: reels and hanging film */}
      <div className="relative flex-1 min-h-0 flex">
        {actorPair && (
          <ReelStage
            chain={chain}
            target={actorPair.end}
            targetReady={targetReachable}
            closing={closing}
            pending={isValidating}
            shakeCount={errorCount}
            onCloseChain={() => selectedMedia && closeChain(selectedMedia.id)}
          />
        )}

        {/* Undo and Start over sit in the stage's corner */}
        {chain.length > 1 && !closing && (
          <div className="absolute top-0 inset-x-0 w-full md:max-w-[1120px] mx-auto px-2 md:px-6 flex justify-end pointer-events-none [&>button]:pointer-events-auto">
            <button
              onClick={undo}
              disabled={isValidating}
              className="w-11 h-11 grid place-items-center rounded-md text-text-secondary hover:text-text disabled:opacity-50"
              aria-label="Undo last pick"
              title="Undo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
            </button>
            <button
              onClick={startOver}
              disabled={isValidating}
              className="w-11 h-11 grid place-items-center rounded-md text-text-secondary hover:text-text disabled:opacity-50"
              aria-label="Start over"
              title="Start over"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 1v5h5" />
                <path d="M3.5 10a6 6 0 1 0 1.2-6.2L1 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Search, hints and messages */}
      <div
        className={`w-full md:max-w-[520px] md:mx-auto px-5 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-8 flex flex-col gap-2 ${closing ? "invisible" : ""}`}
      >
        {showSoftLimit && (
          <p className="text-xs text-text-secondary">Long chain. Try a different path?</p>
        )}
        {hintLadder}
        <div
          ref={(el) => {
            shakeRefs.current[0] = el;
            searchRef.current = el;
          }}
        >
          <SearchInput
            mode={searchMode}
            placeholder={placeholder}
            onSelectMedia={handleSelectMedia}
            onSelectPerson={handleSelectPerson}
            disabled={isValidating}
            excludeActorIds={excludeActorIds}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <p aria-live="polite" className="sr-only-live">
          {isValidating ? "Checking…" : announcement}
        </p>
      </div>
    </div>
  );
}
