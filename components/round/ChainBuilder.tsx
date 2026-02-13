"use client";

import { useState, useEffect, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { validateConnection } from "@/lib/tmdb";
import { MediaResult, PersonResult } from "@/lib/types";
import { CHAIN_SOFT_LIMIT } from "@/lib/actor-pool";
import { formatTime } from "@/lib/scoring";
import { playCardSound, playWinSound, playRemoveSound } from "@/lib/sounds";
import { SearchInput } from "./SearchInput";
import { ChainDisplay } from "./ChainDisplay";

export function ChainBuilder() {
  const { state, dispatch } = useGame();
  const { chain, searchMode, selectedMedia, actorPair, difficulty } = state;

  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const currentActor = chain.length > 0 ? chain[chain.length - 1] : null;

  // Live timer
  useEffect(() => {
    if (!state.startTime) return;
    setElapsed(Date.now() - state.startTime);
    const interval = setInterval(() => {
      setElapsed(Date.now() - state.startTime!);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.startTime]);
  const showSoftLimit = chain.length >= CHAIN_SOFT_LIMIT;

  const excludeActorIds = useMemo(
    () => chain.filter((l) => l.type === "actor").map((l) => l.id),
    [chain],
  );

  const handleSelectMedia = async (media: MediaResult) => {
    if (!currentActor) return;
    setError(null);
    setIsValidating(true);

    try {
      const valid = await validateConnection(
        currentActor.id,
        media.id,
        media.mediaType,
      );

      setIsValidating(false);

      if (!valid) {
        setError(`${currentActor.name} doesn't appear in ${media.title}`);
        return;
      }

      playCardSound();
      dispatch({ type: "SELECT_MEDIA", media });
    } catch {
      setIsValidating(false);
      setError("Connection failed — check your internet and try again");
    }
  };

  const handleSelectPerson = async (person: PersonResult) => {
    if (!selectedMedia) return;
    setError(null);
    setIsValidating(true);

    try {
      const valid = await validateConnection(
        person.id,
        selectedMedia.id,
        selectedMedia.mediaType,
      );

      setIsValidating(false);

      if (!valid) {
        setError(`${person.name} doesn't appear in ${selectedMedia.title}`);
        return;
      }

      if (actorPair && person.id === actorPair.end.id) {
        playWinSound();
      } else {
        playCardSound();
      }
      dispatch({ type: "SELECT_PERSON", person });
    } catch {
      setIsValidating(false);
      setError("Connection failed — check your internet and try again");
    }
  };

  const placeholder =
    searchMode === "media"
      ? `What was ${currentActor?.name} in?`
      : `Who else was in ${selectedMedia?.title}?`;

  const searchBar = (
    <>
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
          className="text-xs uppercase tracking-[0.15em] mt-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Checking...
        </p>
      )}

      {error && (
        <p
          className="text-xs mt-2 max-w-[280px]"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}
    </>
  );

  return (
    <div className="flex flex-col w-full flex-1 pb-24 md:pb-0">
      {/* Header — difficulty + actor pair + timer */}
      <div className="text-center pt-6 md:pt-12 pb-3 md:pb-4">
        {difficulty && (
          <p
            className="text-[10px] uppercase tracking-[0.2em] mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {difficulty}
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
        isComplete={false}
        onUndo={() => {
          playRemoveSound();
          dispatch({ type: "UNDO_LAST" });
          setError(null);
        }}
      >
        {/* Desktop: inline search under placeholder card */}
        <div className="hidden md:block max-w-[240px] w-full">
          {searchBar}
        </div>
      </ChainDisplay>

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
      {chain.length > 1 && (
        <button
          onClick={() => {
            playRemoveSound();
            dispatch({ type: "RESET_CHAIN" });
            setError(null);
          }}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] px-4 py-1.5 rounded-full transition-colors self-center mb-20 md:mb-2"
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
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          background: "var(--color-bg)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
          {searchBar}
        </div>
      </div>
    </div>
  );
}
