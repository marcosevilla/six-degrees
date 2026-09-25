import { test } from "node:test";
import assert from "node:assert/strict";
import { getChainSteps, scoreVsPar, getScoreLabel, elapsedMs } from "./scoring";

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
