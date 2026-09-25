import type { GraphFile } from "../types";

// Actors: A=1 B=2 C=3 D=4 E=5 (E is isolated), F=6
// Titles: m10 {A,B}, m11 {B,C}, t12 {C,D}, m13 {A,F}, m14 {F,C}
// A→B par 1 · A→C par 2 (via B or F; tie → lowest index, B) · A→D par 3 · A→E none
export const tiny: GraphFile = {
  builtAt: "2026-09-25T00:00:00.000Z",
  params: { castDepth: 15, minVotes: 100 },
  actors: [[1, "A"], [2, "B"], [3, "C"], [4, "D"], [5, "E"], [6, "F"]],
  titles: [
    [10, "AB Movie", "movie", "2001", 900],
    [11, "BC Movie", "movie", "2002", 800],
    [12, "CD Show", "tv", "2003", 700],
    [13, "AF Movie", "movie", "2004", 600],
    [14, "FC Movie", "movie", "2005", 500],
  ],
  cast: [[0, 1], [1, 2], [2, 3], [0, 5], [5, 2]],
};
