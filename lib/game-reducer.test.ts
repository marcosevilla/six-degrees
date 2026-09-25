import { test } from "node:test";
import assert from "node:assert/strict";
import { gameReducer, initialGameState } from "./game-reducer";
import type { GameState, MediaResult } from "./types";

const A = { id: 1, name: "A", profilePath: null };
const B = { id: 2, name: "B", profilePath: null };
const FILM: MediaResult = { id: 9, title: "M", year: "", posterPath: null, mediaType: "movie" };

const started = (): GameState =>
  gameReducer(gameReducer(initialGameState, { type: "BEGIN_REVEAL", difficulty: "medium" }), {
    type: "START_GAME",
    pair: { start: A, end: B },
    difficulty: "medium",
    par: 2,
    now: 1000,
  });

// --- Item 1: par in state, dealing only through the reveal ---

test("START_GAME carries par and starts a clean round", () => {
  const s = started();
  assert.equal(s.phase, "playing");
  assert.equal(s.par, 2);
  assert.equal(s.startTime, 1000);
  assert.deepEqual([s.hintsUsed, s.pausedMs, s.closing, s.endReason, s.bestRoute], [0, 0, false, null, null]);
  assert.deepEqual(s.chain, [{ type: "actor", id: 1, name: "A", profilePath: null }]);
});

test("START_GAME is ignored unless the reveal is running", () => {
  const s = gameReducer(initialGameState, {
    type: "START_GAME",
    pair: { start: A, end: B },
    difficulty: "easy",
    par: 1,
    now: 1,
  });
  assert.equal(s, initialGameState);
});

test("BEGIN_REVEAL from results starts a clean game at that difficulty", () => {
  const done: GameState = { ...started(), phase: "results", endReason: "won", hintsUsed: 2, endTime: 5 };
  const s = gameReducer(done, { type: "BEGIN_REVEAL", difficulty: "medium" });
  assert.deepEqual([s.phase, s.difficulty, s.hintsUsed, s.actorPair, s.endReason], ["revealing", "medium", 0, null, null]);
});

test("BEGIN_REVEAL mid-round is ignored", () => {
  const s = started();
  assert.equal(gameReducer(s, { type: "BEGIN_REVEAL", difficulty: "easy" }), s);
});

test("PLAY_AGAIN returns home", () => {
  assert.deepEqual(gameReducer(started(), { type: "PLAY_AGAIN" }), initialGameState);
});

// --- Item 2: the clock pauses while moves are checked ---

test("PAUSE then RESUME adds the paused time; a second PAUSE keeps the first start", () => {
  let s = gameReducer(started(), { type: "PAUSE_TIMER", now: 2000 });
  s = gameReducer(s, { type: "PAUSE_TIMER", now: 2500 });
  s = gameReducer(s, { type: "RESUME_TIMER", now: 3000 });
  assert.deepEqual([s.pausedMs, s.pauseStartedAt], [1000, null]);
});

test("RESUME without a PAUSE changes nothing", () => {
  const s = started();
  assert.equal(gameReducer(s, { type: "RESUME_TIMER", now: 5 }), s);
});

test("PAUSE outside play changes nothing", () => {
  assert.equal(gameReducer(initialGameState, { type: "PAUSE_TIMER", now: 5 }), initialGameState);
});
