export function getChainSteps(chainLength: number): number {
  // "Steps" = number of movies used to connect = (chainLength - 1) / 2
  return Math.floor((chainLength - 1) / 2);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;
}

export function getScoreLabel(steps: number): string {
  if (steps <= 1) return "Incredible!";
  if (steps === 2) return "Amazing!";
  if (steps === 3) return "Nice!";
  return "You got it!";
}
