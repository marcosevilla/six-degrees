"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchMedia, searchPeople } from "@/lib/tmdb";
import { MediaResult, PersonResult, SearchMode } from "@/lib/types";
import { SearchResults } from "./SearchResults";

interface SearchInputProps {
  mode: SearchMode;
  placeholder: string;
  onSelectMedia: (media: MediaResult) => void;
  onSelectPerson: (person: PersonResult) => void;
  disabled?: boolean;
  excludeActorIds?: number[];
}

export function SearchInput({
  mode,
  placeholder,
  onSelectMedia,
  onSelectPerson,
  disabled,
  excludeActorIds = [],
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(MediaResult | PersonResult)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const doSearch = async () => {
      const data =
        mode === "media"
          ? await searchMedia(debouncedQuery)
          : await searchPeople(debouncedQuery);

      if (cancelled) return;

      const filtered =
        mode === "person"
          ? (data as PersonResult[]).filter(
              (p) => !excludeActorIds.includes(p.id),
            )
          : data;

      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setHighlightedIndex(-1);
      setIsLoading(false);
    };

    doSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, mode, excludeActorIds]);

  const handleSelect = useCallback(
    (item: MediaResult | PersonResult) => {
      if (mode === "media") {
        onSelectMedia(item as MediaResult);
      } else {
        onSelectPerson(item as PersonResult);
      }
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [mode, onSelectMedia, onSelectPerson],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        autoCapitalize="words"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `search-result-${highlightedIndex}` : undefined
        }
        className={`w-full min-h-12 pl-3 pr-10 text-base bg-surface text-text placeholder:text-text-secondary border-[1.5px] border-border outline-none transition-[border-color] duration-150 focus:border-accent disabled:opacity-60 ${
          isOpen && results.length > 0 ? "rounded-b-md border-t-0" : "rounded-md"
        }`}
        onFocus={() => results.length > 0 && setIsOpen(true)}
      />
      {isLoading && (
        <div
          aria-hidden="true"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-[1.5px] rounded-full animate-spin"
          style={{
            borderColor: "var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      )}
      {isOpen && results.length > 0 && (
        <SearchResults
          results={results}
          mode={mode}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          highlightedIndex={highlightedIndex}
        />
      )}
    </div>
  );
}
