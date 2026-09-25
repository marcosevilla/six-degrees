"use client";

import { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { fetchFilmography, fetchRoute } from "@/lib/tmdb";
import { routeToLinks } from "@/lib/route-links";
import { getPosterUrl } from "@/lib/actor-pool";
import type { ChainLink, MediaResult, PoolActor } from "@/lib/types";

interface HintLadderProps {
  currentActor: ChainLink;
  start: PoolActor;
  target: PoolActor;
  // Picking a hinted film goes through the normal validated pick.
  onPickFilm: (media: MediaResult) => void;
  disabled?: boolean;
}

// Stuck exits, Strands-style: each rung reveals more than the last and costs +1.
//   1. the current actor's best-known films (tap one to play it)
//   2. the next link on a best route from here
// "Show me a route" gives up and shows a best route on results.
export function HintLadder({ currentActor, start, target, onPickFilm, disabled = false }: HintLadderProps) {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const filmsShown = state.hintFilms?.actorId === currentActor.id;
  const linkShown = state.hintLink?.actorId === currentActor.id;
  const rung: "films" | "link" | null =
    state.searchMode === "media" && !filmsShown ? "films" : !linkShown ? "link" : null;

  const takeHint = async () => {
    if (!rung) return;
    setLoading(true);
    setNotice(null);
    try {
      if (rung === "films") {
        const films = await fetchFilmography(currentActor.id);
        dispatch({ type: "USE_HINT_FILMS", actorId: currentActor.id, films });
      } else {
        // With a film already picked, name the best costar from that film.
        const via = state.searchMode === "person" ? state.selectedMedia : null;
        const route = await fetchRoute(currentActor.id, target.id, via);
        if (!route) {
          // Free: we couldn't help, so it doesn't cost a stroke.
          setNotice(
            via
              ? "No route through this title. Undo it, or try Show me a route."
              : "No hint from here. Try Start over or Show me a route.",
          );
          return;
        }
        const links = routeToLinks(route).slice(1, 3);
        dispatch({ type: "USE_HINT_LINK", actorId: currentActor.id, links });
      }
    } catch {
      setNotice("Couldn't load a hint. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const giveUp = async () => {
    setLoading(true);
    let bestRoute: ChainLink[] | null = null;
    try {
      const route = await fetchRoute(start.id, target.id);
      bestRoute = route ? routeToLinks(route) : null;
    } catch {
      // Results says the best route couldn't be loaded.
    }
    dispatch({ type: "GIVE_UP", bestRoute, now: Date.now() });
  };

  const [linkTitle, linkActor] = linkShown ? state.hintLink!.links : [];

  return (
    <div className="flex flex-col gap-2 w-full" aria-live="polite">
      {filmsShown && state.hintFilms!.films.length > 0 && state.searchMode === "media" && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="list" aria-label={`${currentActor.name}'s best-known titles`}>
          {state.hintFilms!.films.map((film) => (
            <button
              key={`${film.mediaType}-${film.id}`}
              role="listitem"
              onClick={() => onPickFilm(film)}
              disabled={disabled}
              className="flex-shrink-0 flex flex-col items-center gap-1 w-14 md:w-16 transition-transform active:scale-95 disabled:opacity-50"
              title={`${film.title}${film.year ? ` (${film.year})` : ""}`}
            >
              <div
                className="w-full aspect-[2/3] overflow-hidden"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                {film.posterPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getPosterUrl(film.posterPath, "w154")} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-[9px] leading-tight text-center line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                {film.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {linkShown && linkTitle && linkActor && (
        <p className="text-xs" style={{ color: "var(--color-text)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Try </span>
          <span className="italic">{linkTitle.name}</span>
          <span style={{ color: "var(--color-text-secondary)" }}> → </span>
          {linkActor.name}
        </p>
      )}

      {notice && (
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {notice}
        </p>
      )}

      {confirming ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs" style={{ color: "var(--color-text)" }}>
            Give up and see a best route?
          </span>
          <button
            onClick={giveUp}
            disabled={loading}
            className="text-xs uppercase tracking-[0.15em] px-3 min-h-[36px] rounded-full disabled:opacity-50"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            {loading ? "…" : "Show route"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs uppercase tracking-[0.15em] px-3 min-h-[36px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Keep playing
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between md:justify-start gap-2">
          {rung && (
            <button
              onClick={takeHint}
              disabled={loading || disabled}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] px-3 min-h-[36px] rounded-full whitespace-nowrap transition-colors disabled:opacity-50"
              style={{ color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            >
              <LightbulbIcon />
              {loading ? "…" : rung === "films" ? "Hint · top films" : "Hint · next link"}
              <span style={{ color: "var(--color-text-secondary)" }}>+1</span>
            </button>
          )}
          <button
            onClick={() => setConfirming(true)}
            disabled={disabled}
            className="text-xs uppercase tracking-[0.1em] px-2 min-h-[36px] whitespace-nowrap transition-colors disabled:opacity-50"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Show me a route
          </button>
        </div>
      )}
    </div>
  );
}

function LightbulbIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}
