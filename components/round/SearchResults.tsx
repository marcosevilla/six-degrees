"use client";

import { useEffect, useRef } from "react";
import { MediaResult, PersonResult, SearchMode } from "@/lib/types";
import { getProfileUrl, getPosterUrl } from "@/lib/actor-pool";

interface SearchResultsProps {
  results: (MediaResult | PersonResult)[];
  mode: SearchMode;
  onSelect: (item: MediaResult | PersonResult) => void;
  onClose: () => void;
  highlightedIndex?: number;
}

export function SearchResults({
  results,
  mode,
  onSelect,
  onClose,
  highlightedIndex = -1,
}: SearchResultsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && ref.current) {
      const el = ref.current.querySelector(`[data-index="${highlightedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const highlightStyle = { background: "rgba(255, 255, 255, 0.08)" };

  return (
    <div
      ref={ref}
      role="listbox"
      className="absolute z-50 w-full mt-0 overflow-hidden overflow-y-auto bottom-full mb-1 md:bottom-auto md:top-full md:mb-0 max-h-[40vh] md:max-h-64 rounded-t-lg md:rounded-t-none"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {results.map((item, index) => {
        const isHighlighted = index === highlightedIndex;

        if (mode === "media") {
          const media = item as MediaResult;
          return (
            <button
              key={`${media.mediaType}-${media.id}`}
              id={`search-result-${index}`}
              data-index={index}
              role="option"
              aria-selected={isHighlighted}
              onClick={() => onSelect(media)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
              style={isHighlighted ? highlightStyle : undefined}
            >
              {media.posterPath ? (
                <img
                  src={getPosterUrl(media.posterPath, "w92")}
                  alt=""
                  className="w-7 h-10 object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-10 flex-shrink-0"
                  style={{ background: "var(--color-border)" }}
                />
              )}
              <div className="min-w-0">
                <div className="text-sm truncate" style={{ color: "var(--color-text)" }}>
                  {media.title}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {media.mediaType === "tv" ? "TV" : "Film"}
                  {media.year ? `, ${media.year}` : ""}
                </div>
              </div>
            </button>
          );
        }

        const person = item as PersonResult;
        return (
          <button
            key={person.id}
            id={`search-result-${index}`}
            data-index={index}
            role="option"
            aria-selected={isHighlighted}
            onClick={() => onSelect(person)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
            style={isHighlighted ? highlightStyle : undefined}
          >
            {person.profilePath ? (
              <img
                src={getProfileUrl(person.profilePath, "w45")}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0"
                style={{ background: "var(--color-border)" }}
              />
            )}
            <div className="text-sm truncate" style={{ color: "var(--color-text)" }}>
              {person.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
