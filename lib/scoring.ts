import type { ChainLink, GameState } from "./types";

// Steps = titles used to connect the two actors.
export function getChainSteps(chain: ChainLink[]): number {
  return chain.filter((l) => l.type === "media").length;
}

// Golf scoring: every step and every hint counts, par comes off. Below zero is
// possible because the solver's graph is pruned; an obscure film can beat it.
export function scoreVsPar(steps: number, hintsUsed: number, par: number): number {
  return steps + hintsUsed - par;
}

export function getScoreLabel(delta: number): string {
  if (delta < 0) return "Under par!";
  if (delta === 0) return "Par";
  return `+${delta}`;
}

// Time is only a tiebreaker, and time spent waiting on validation doesn't count.
export function elapsedMs(
  s: Pick<GameState, "startTime" | "endTime" | "pausedMs" | "pauseStartedAt">,
  now: number,
): number {
  if (s.startTime === null) return 0;
  const end = s.endTime ?? now;
  const openPause = s.pauseStartedAt !== null && s.endTime === null ? end - s.pauseStartedAt : 0;
  return Math.max(0, end - s.startTime - s.pausedMs - openPause);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;
}

// Spoiler-free share line in the Wordle / Strands family: no names, one 🎬 per
// step, 💡 per hint, the result against par, and the link last (like Framed).
export function buildShareText({
  par,
  steps,
  hintsUsed,
  endReason,
  url,
}: {
  par: number;
  steps: number;
  hintsUsed: number;
  endReason: "won" | "gaveUp";
  url: string;
}): string {
  const head = `Six Degrees · Par ${par}`;
  if (endReason === "gaveUp") return `${head}\n🏳️ Gave up\n${url}`;
  const delta = scoreVsPar(steps, hintsUsed, par);
  const result = delta < 0 ? `Under par (${delta})` : getScoreLabel(delta);
  const hints = hintsUsed > 0 ? ` ${"💡".repeat(hintsUsed)}` : "";
  return `${head}\n${"🎬".repeat(steps)}${hints} · ${result}\n${url}`;
}
