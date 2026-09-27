import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShareText, getChainSteps, scoreVsPar, getScoreLabel, elapsedMs, formatTimecode, scoreHeadline, stockSquares } from "./scoring";

test("steps count the titles in the chain", () => {
  assert.equal(
    getChainSteps([
      { type: "actor", id: 1, name: "A" },
      { type: "media", id: 2, name: "M" },
      { type: "actor", id: 3, name: "B" },
    ]),
    1,
  );
  assert.equal(getChainSteps([{ type: "actor", id: 1, name: "A" }]), 0);
});

test("score is steps plus hints minus par", () => {
  assert.equal(scoreVsPar(3, 1, 2), 2);
  assert.equal(scoreVsPar(1, 0, 2), -1);
  assert.equal(scoreVsPar(2, 0, 2), 0);
});

test("labels are par-relative", () => {
  assert.equal(getScoreLabel(-1), "Under par!");
  assert.equal(getScoreLabel(-2), "Under par!");
  assert.equal(getScoreLabel(0), "Par");
  assert.equal(getScoreLabel(1), "+1");
  assert.equal(getScoreLabel(3), "+3");
});

test("elapsed time leaves out paused time, including a pause in progress", () => {
  assert.equal(elapsedMs({ startTime: 0, endTime: null, pausedMs: 300, pauseStartedAt: null }, 1000), 700);
  assert.equal(elapsedMs({ startTime: 0, endTime: null, pausedMs: 0, pauseStartedAt: 800 }, 1000), 800);
  assert.equal(elapsedMs({ startTime: 0, endTime: 900, pausedMs: 100, pauseStartedAt: null }, 5000), 800);
  assert.equal(elapsedMs({ startTime: null, endTime: null, pausedMs: 0, pauseStartedAt: null }, 5000), 0);
});

test("share text: one 🎬 per step, 💡 per hint, par-relative result, link last", () => {
  const url = "https://example.com/play?pair=1-2";
  assert.equal(
    buildShareText({ par: 2, steps: 3, hintsUsed: 1, endReason: "won", url }),
    `Six Degrees · Par 2\n🟦🟧🟥💡 +2\n${url}`,
  );
  assert.equal(buildShareText({ par: 2, steps: 2, hintsUsed: 0, endReason: "won", url }), `Six Degrees · Par 2\n🟦🟧 Par\n${url}`);
  assert.equal(
    buildShareText({ par: 2, steps: 1, hintsUsed: 0, endReason: "won", url }),
    `Six Degrees · Par 2\n🟦 Under par (-1)\n${url}`,
  );
  assert.equal(
    buildShareText({ par: 1, steps: 0, hintsUsed: 2, endReason: "gaveUp", url }),
    `Six Degrees · Par 1\n🏳️ Gave up\n${url}`,
  );
});

test("formatTimecode pads minutes and seconds", () => {
  assert.equal(formatTimecode(0), "00:00");
  assert.equal(formatTimecode(48_900), "00:48");
  assert.equal(formatTimecode(725_000), "12:05");
});

test("scoreHeadline reads the result in words", () => {
  assert.equal(scoreHeadline(0, false), "Right on par");
  assert.equal(scoreHeadline(2, false), "Two over par");
  assert.equal(scoreHeadline(-1, false), "One under par");
  assert.equal(scoreHeadline(12, false), "12 over par");
  assert.equal(scoreHeadline(3, true), "Gave up");
});

test("stockSquares follows the film stock rotation", () => {
  assert.equal(stockSquares(5), "🟦🟧🟥🟩🟦");
  assert.equal(stockSquares(0), "");
});
