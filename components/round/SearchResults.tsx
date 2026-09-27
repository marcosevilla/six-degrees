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

  return (
    <div
      ref={ref}
      role="listbox"
      className="absolute z-50 w-full bottom-full overflow-y-auto max-h-[min(40vh,300px)] bg-surface border-[1.5px] border-border border-b-0 rounded-t-md"
    >
      {results.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        const row = `w-full min-h-12 flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-hover ${
          index > 0 ? "border-t border-divider" : ""
        } ${isHighlighted ? "bg-hover" : ""}`;

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
              className={row}
            >
              {media.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getPosterUrl(media.posterPath, "w92")}
                  alt=""
                  className="w-7 h-10 object-cover flex-shrink-0 rounded-[2px] outline outline-1 -outline-offset-1 outline-white/10"
                />
              ) : (
                <div className="w-7 h-10 flex-shrink-0 rounded-[2px] bg-divider" />
              )}
              <span className="flex-1 min-w-0 text-base truncate">{media.title}</span>
              <span className="font-mono text-xs text-text-secondary shrink-0">
                {media.mediaType === "tv" ? "TV " : ""}
                {media.year}
              </span>
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
            className={row}
          >
            {person.profilePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getProfileUrl(person.profilePath, "w45")}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 outline outline-1 -outline-offset-1 outline-white/10"
              />
            ) : (
              <div className="w-7 h-7 rounded-full flex-shrink-0 bg-divider" />
            )}
            <span className="text-base truncate">{person.name}</span>
          </button>
        );
      })}
    </div>
  );
}
