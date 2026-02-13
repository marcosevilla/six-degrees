"use client";

import { ChainBuilder } from "@/components/round/ChainBuilder";

export function PlayingScreen() {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 flex flex-col">
        <ChainBuilder />
      </div>
    </div>
  );
}
