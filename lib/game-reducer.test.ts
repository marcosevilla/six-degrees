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

// --- Item 3: stuck exits ---

const withFilm = () => gameReducer(started(), { type: "SELECT_MEDIA", media: FILM });

test("RESET_CHAIN resets the clock but keeps what hints cost", () => {
  let s = gameReducer(started(), { type: "USE_HINT_FILMS", actorId: 1, films: [FILM] });
  s = gameReducer(s, { type: "SELECT_MEDIA", media: FILM });
  s = gameReducer(s, { type: "PAUSE_TIMER", now: 1500 });
  s = gameReducer(s, { type: "RESET_CHAIN", now: 4000 });
  assert.deepEqual(
    [s.chain.length, s.startTime, s.pausedMs, s.pauseStartedAt, s.hintsUsed, s.hintFilms, s.searchMode],
    [1, 4000, 0, null, 1, null, "media"],
  );
});

test("each hint costs one", () => {
  let s = gameReducer(started(), { type: "USE_HINT_FILMS", actorId: 1, films: [FILM] });
  s = gameReducer(s, {
    type: "USE_HINT_LINK",
    actorId: 1,
    links: [
      { type: "media", id: 5, name: "T" },
      { type: "actor", id: 7, name: "C" },
    ],
  });
  assert.equal(s.hintsUsed, 2);
  assert.equal(s.hintLink?.actorId, 1);
  assert.equal(s.hintFilms?.films.length, 1);
});

test("hints clear when the chain moves to a new actor", () => {
  let s = gameReducer(started(), { type: "USE_HINT_FILMS", actorId: 1, films: [FILM] });
  s = gameReducer(s, { type: "SELECT_MEDIA", media: FILM });
  assert.equal(s.hintFilms?.actorId, 1, "still on actor 1 while picking a costar");
  s = gameReducer(s, { type: "SELECT_PERSON", person: { id: 3, name: "C", profilePath: null } });
  assert.deepEqual([s.hintFilms, s.hintLink], [null, null]);
});

test("GIVE_UP lands on results with the best route and stops the clock", () => {
  const route = [{ type: "actor" as const, id: 1, name: "A" }];
  let s = gameReducer(withFilm(), { type: "PAUSE_TIMER", now: 8000 });
  s = gameReducer(s, { type: "GIVE_UP", bestRoute: route, now: 9000 });
  assert.deepEqual(
    [s.phase, s.endReason, s.endTime, s.bestRoute, s.pausedMs, s.pauseStartedAt],
    ["results", "gaveUp", 9000, route, 1000, null],
  );
});

test("GIVE_UP and hints outside play change nothing", () => {
  assert.equal(gameReducer(initialGameState, { type: "GIVE_UP", bestRoute: null, now: 1 }), initialGameState);
  assert.equal(gameReducer(initialGameState, { type: "USE_HINT_FILMS", actorId: 1, films: [] }), initialGameState);
});

test("a link hint goes stale when the picked film changes", () => {
  const link = { type: "USE_HINT_LINK" as const, actorId: 1, links: [{ type: "media" as const, id: 9, name: "M" }, { type: "actor" as const, id: 7, name: "C" }] };
  let s = gameReducer(withFilm(), link);
  assert.equal(gameReducer(s, { type: "UNDO_LAST" }).hintLink, null, "undoing the film drops it");
  s = gameReducer(started(), link);
  assert.equal(gameReducer(s, { type: "SELECT_MEDIA", media: FILM }).hintLink, null, "picking a film drops it");
});

// --- Item 4: tap the target to close the chain ---

test("CLOSE_CHAIN adds the target and stops the clock, but stays in play for the beat", () => {
  const s = gameReducer(withFilm(), { type: "CLOSE_CHAIN", now: 7000 });
  assert.deepEqual([s.phase, s.closing, s.endTime, s.chain.at(-1)?.id, s.searchMode], ["playing", true, 7000, 2, "media"]);
});

test("CLOSE_CHAIN needs a picked film and only fires once", () => {
  const s0 = started();
  assert.equal(gameReducer(s0, { type: "CLOSE_CHAIN", now: 1 }), s0);
  const closed = gameReducer(withFilm(), { type: "CLOSE_CHAIN", now: 7000 });
  assert.equal(gameReducer(closed, { type: "CLOSE_CHAIN", now: 8000 }), closed);
});

test("CLOSE_CHAIN folds an open pause into paused time", () => {
  let s = gameReducer(withFilm(), { type: "PAUSE_TIMER", now: 6000 });
  s = gameReducer(s, { type: "CLOSE_CHAIN", now: 7000 });
  assert.deepEqual([s.pausedMs, s.pauseStartedAt], [1000, null]);
});

test("FINISH only follows CLOSE_CHAIN", () => {
  const s0 = withFilm();
  assert.equal(gameReducer(s0, { type: "FINISH", bestRoute: null }), s0);
  const route = [{ type: "actor" as const, id: 1, name: "A" }];
  const s = gameReducer(gameReducer(s0, { type: "CLOSE_CHAIN", now: 7000 }), { type: "FINISH", bestRoute: route });
  assert.deepEqual([s.phase, s.endReason, s.closing, s.bestRoute], ["results", "won", false, route]);
});

test("naming the target in search doesn't skip the close", () => {
  const s0 = withFilm();
  assert.equal(gameReducer(s0, { type: "SELECT_PERSON", person: { id: 2, name: "B", profilePath: null } }), s0);
});

test("nothing else moves while the chain is closing", () => {
  const closed = gameReducer(withFilm(), { type: "CLOSE_CHAIN", now: 7000 });
  assert.equal(gameReducer(closed, { type: "GIVE_UP", bestRoute: null, now: 8000 }), closed);
  assert.equal(gameReducer(closed, { type: "UNDO_LAST" }), closed);
  assert.equal(gameReducer(closed, { type: "RESET_CHAIN", now: 8000 }), closed);
  assert.equal(gameReducer(closed, { type: "SELECT_MEDIA", media: FILM }), closed);
});
