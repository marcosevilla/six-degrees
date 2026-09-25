"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchRoute, validateConnection } from "@/lib/tmdb";
import { routeToLinks } from "@/lib/route-links";
import { closeBeatMs } from "@/lib/motion";
import { ChainLink, MediaResult, PersonResult } from "@/lib/types";
import { CHAIN_SOFT_LIMIT } from "@/lib/actor-pool";
import { elapsedMs, formatTime } from "@/lib/scoring";
import { playCardSound, playWinSound, playRemoveSound } from "@/lib/sounds";
import { SearchInput } from "./SearchInput";
import { ChainDisplay } from "./ChainDisplay";
import { HintLadder } from "./HintLadder";

export function ChainBuilder() {
  const { state, dispatch } = useGame();
  const { chain, searchMode, selectedMedia, actorPair, difficulty, par } = state;

  const [error, setError] = useState<string | null>(null);
  // Bumped on every rejected pick so the shake replays even for the same message.
  const [errorCount, setErrorCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
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

  const reject = (message: string) => {
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
    // The best route for results loads during the beat (graph-only, ~ms).
    const route = fetchRoute(actorPair.start.id, actorPair.end.id)
      .then((r) => (r ? routeToLinks(r) : null))
      .catch(() => null);
    const timer = setTimeout(finish, closeBeatMs(chain.length + 1));
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
      dispatch({ type: "SELECT_PERSON", person, mediaId: selectedMedia.id });
    } catch {
      reject("Connection failed — check your internet and try again");
    }
  };

  const targetReachable =
    searchMode === "person" && selectedMedia !== null && reachableMediaId === selectedMedia.id;

  const hintLadder =
    actorPair && lastActor && !closing ? (
      <div className="w-full md:max-w-[480px]">
        <HintLadder
          currentActor={lastActor}
          start={actorPair.start}
          target={actorPair.end}
          onPickFilm={handleSelectMedia}
          disabled={isValidating}
        />
      </div>
    ) : null;

  const placeholder =
    searchMode === "media"
      ? `What was ${currentActor?.name} in?`
      : `Who else was in ${selectedMedia?.title}?`;

  // Rendered twice (desktop inline, mobile bottom bar), so each copy gets a ref slot.
  const searchBar = (slot: number) => (
    <div ref={(el) => { shakeRefs.current[slot] = el; }}>
      <SearchInput
        mode={searchMode}
        placeholder={placeholder}
        onSelectMedia={handleSelectMedia}
        onSelectPerson={handleSelectPerson}
        disabled={isValidating}
        excludeActorIds={excludeActorIds}
      />

      {isValidating && (
        <p
          role="status"
          className="text-xs uppercase tracking-[0.15em] mt-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Checking...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="text-xs mt-2 max-w-[280px]"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );

  return (
    // While the chain closes, a tap anywhere skips to results.
    <div className="flex flex-col w-full flex-1 pb-24 md:pb-0" onClick={closing ? finish : undefined}>
      {/* Header — difficulty + actor pair + timer */}
      <div className="text-center pt-6 md:pt-12 pb-3 md:pb-4">
        {difficulty && (
          <p
            className="text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {difficulty}
            {par !== null && ` · Par ${par}`}
            {state.hintsUsed > 0 && ` · +${state.hintsUsed} hint${state.hintsUsed === 1 ? "" : "s"}`}
          </p>
        )}
        {actorPair && (
          <h1
            className="text-lg md:text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {actorPair.start.name}
            <span style={{ color: "var(--color-text-secondary)" }}> → </span>
            {actorPair.end.name}
          </h1>
        )}
        <p
          className="text-sm tabular-nums mt-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {formatTime(elapsed)}
        </p>
      </div>

      {/* Spacer above chain */}
      <div className="flex-[0.3] md:flex-[0.8]" />

      {/* Horizontal chain strip + search bar (desktop only inline) */}
      <ChainDisplay
        chain={chain}
        currentSearchMode={searchMode}
        targetActor={actorPair?.end ?? { name: "", id: 0 }}
        isComplete={closing}
        targetState={targetReachable ? "reachable" : "idle"}
        onCloseChain={() => selectedMedia && closeChain(selectedMedia.id)}
        onUndo={() => {
          if (isValidating) return;
          playRemoveSound();
          dispatch({ type: "UNDO_LAST" });
          setError(null);
        }}
      >
        {/* Desktop: inline search under placeholder card */}
        {!closing && (
          <div className="hidden md:block max-w-[240px] w-full">
            {searchBar(0)}
          </div>
        )}
      </ChainDisplay>

      {/* Desktop: stuck exits under the chain */}
      {hintLadder && <div className="hidden md:flex justify-center px-8 mt-4">{hintLadder}</div>}

      {showSoftLimit && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Long chain — try a different path?
        </p>
      )}

      {/* Spacer pushes Start over to bottom */}
      <div className="flex-[0.3] md:flex-[0.8]" />

      {/* Reset chain */}
      {chain.length > 1 && !closing && (
        <button
          onClick={() => {
            playRemoveSound();
            dispatch({ type: "RESET_CHAIN", now: Date.now() });
            setError(null);
          }}
          disabled={isValidating}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] px-4 py-1.5 rounded-full transition-colors self-center mb-20 md:mb-2 disabled:opacity-50"
          style={{
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1v5h5" />
            <path d="M3.5 10a6 6 0 1 0 1.2-6.2L1 6" />
          </svg>
          Start over
        </button>
      )}

      {/* Mobile: sticky search bar at bottom */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden ${closing ? "invisible" : ""}`}
        style={{
          background: "var(--color-bg)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] flex flex-col gap-2">
          {hintLadder}
          {searchBar(1)}
        </div>
      </div>
    </div>
  );
}
