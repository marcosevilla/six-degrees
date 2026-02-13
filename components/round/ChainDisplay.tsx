"use client";

import { useRef, useEffect, useState, useCallback, ReactNode } from "react";
import { ChainLink, SearchMode } from "@/lib/types";
import { ChainCard, ChainConnector } from "./ChainCard";

interface ChainDisplayProps {
  chain: ChainLink[];
  currentSearchMode: SearchMode;
  targetActor: { name: string; id: number; profilePath?: string | null };
  isComplete: boolean;
  onUndo?: () => void;
  children?: ReactNode;
}

export function ChainDisplay({
  chain,
  currentSearchMode,
  targetActor,
  isComplete,
  onUndo,
  children,
}: ChainDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(chain.length);
  const [newestIndex, setNewestIndex] = useState(-1);
  const [isWaving, setIsWaving] = useState(false);
  const [searchLeft, setSearchLeft] = useState(0);

  // Dynamic card heights — shrink as chain grows
  const chainLength = chain.length;
  const bookendH = Math.max(20, 30 - (chainLength - 1) * 3);
  const intermediateH = Math.max(14, bookendH * 0.7);

  // Track placeholder position for search bar alignment
  const updateSearchPosition = useCallback(() => {
    if (placeholderRef.current && containerRef.current) {
      const placeholderRect = placeholderRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setSearchLeft(placeholderRect.left - containerRect.left);
    }
  }, []);

  useEffect(() => {
    updateSearchPosition();
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", updateSearchPosition);
    window.addEventListener("resize", updateSearchPosition);
    return () => {
      scrollEl?.removeEventListener("scroll", updateSearchPosition);
      window.removeEventListener("resize", updateSearchPosition);
    };
  }, [updateSearchPosition, chain.length]);

  // Detect new card additions and trigger flip animation
  useEffect(() => {
    if (chain.length > prevLength.current && chain.length > 1) {
      setNewestIndex(chain.length - 1);
      const timer = setTimeout(() => setNewestIndex(-1), 500);
      prevLength.current = chain.length;
      return () => clearTimeout(timer);
    }
    prevLength.current = chain.length;
  }, [chain.length]);

  // Auto-scroll to show newest cards, then update search position
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
      // Update position after scroll animation settles
      const timer = setTimeout(updateSearchPosition, 400);
      return () => clearTimeout(timer);
    }
  }, [chain.length, updateSearchPosition]);

  // Trigger wave animation on completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsWaving(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  const displayChain = isComplete ? chain.slice(0, -1) : chain;

  return (
    <div ref={containerRef} className="relative flex flex-col w-full">
      <div className="flex items-center w-full relative">
        {/* Scrollable chain area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-hide"
        >
          <div className="flex items-center px-3 md:px-8 py-4 min-w-min">
            {displayChain.map((link, i) => (
              <div
                key={`${link.type}-${link.id}-${i}`}
                className="flex items-center"
              >
                {i > 0 && <ChainConnector swayIndex={i} />}
                <ChainCard
                  variant={i === 0 ? "start" : link.type === "actor" ? "actor" : "media"}
                  name={link.name}
                  imagePath={link.type === "actor" ? link.profilePath : link.posterPath}
                  mediaType={link.mediaType}
                  isNew={i === newestIndex}
                  isNewest={!isComplete && i === displayChain.length - 1 && i > 0}
                  onRemove={onUndo}
                  isWaving={isWaving}
                  waveDelay={isComplete ? (displayChain.length - 1 - i) * 80 : 0}
                  heightDvh={i === 0 ? bookendH : intermediateH}
                  bobIndex={i}
                />
              </div>
            ))}

            {/* Placeholder for next pick */}
            {!isComplete && (
              <div ref={placeholderRef} className="flex items-center">
                <ChainConnector confirmed={false} />
                <ChainCard
                  variant="placeholder"
                  searchMode={currentSearchMode}
                  heightDvh={intermediateH}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint gradient — mobile only */}
        <div
          className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none md:hidden z-10"
          style={{ background: "linear-gradient(to right, transparent, var(--color-bg))" }}
        />

        {/* Pinned target actress — no connector until complete */}
        <div className="flex-shrink-0 flex items-center pr-3 md:pr-8">
          {isComplete && <ChainConnector confirmed />}
          <ChainCard
            variant="end"
            name={targetActor.name}
            imagePath={targetActor.profilePath}
            isActive={isComplete}
            isWaving={isWaving}
            waveDelay={0}
            heightDvh={bookendH}
          />
        </div>
      </div>

      {/* Search slot — dynamically positioned under placeholder */}
      {children && (
        <div
          className="mt-3 transition-[margin] duration-200"
          style={{ marginLeft: `${searchLeft}px` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
