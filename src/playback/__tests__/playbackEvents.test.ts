import { describe, it, expect } from "vitest";
import { getScoreDuration } from "../TonePlayback";
import { factory } from "../../model";

describe("getScoreDuration", () => {
  it("returns one measure duration for an empty score (measure 0 always counted)", () => {
    const score = factory.score("", "", [
      factory.part("P", "P", [
        factory.measure([factory.voice([])]),
      ]),
    ]);
    score.tempo = 120;
    // findLastContentMeasure returns 0, so measure 0 is always iterated
    // 4/4 at 120 BPM = 2 seconds
    expect(getScoreDuration(score)).toBe(2);
  });

  it("returns correct duration for one measure of quarter notes at 120 BPM", () => {
    const score = factory.score("", "", [
      factory.part("P", "P", [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.note("D", 4, factory.dur("quarter")),
            factory.note("E", 4, factory.dur("quarter")),
            factory.note("F", 4, factory.dur("quarter")),
          ]),
        ]),
      ]),
    ]);
    score.tempo = 120;
    // 4 quarter notes at 120 BPM = 1 measure = 4 beats = 2 seconds
    expect(getScoreDuration(score)).toBe(2);
  });

  it("returns correct duration for multiple measures", () => {
    const score = factory.score("", "", [
      factory.part("P", "P", [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.note("D", 4, factory.dur("quarter")),
            factory.note("E", 4, factory.dur("quarter")),
            factory.note("F", 4, factory.dur("quarter")),
          ]),
        ]),
        factory.measure([
          factory.voice([
            factory.note("G", 4, factory.dur("half")),
            factory.note("A", 4, factory.dur("half")),
          ]),
        ]),
      ]),
    ]);
    score.tempo = 120;
    // 2 measures at 120 BPM = 8 beats = 4 seconds
    expect(getScoreDuration(score)).toBe(4);
  });

  it("skips trailing empty measures", () => {
    const score = factory.score("", "", [
      factory.part("P", "P", [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("whole")),
          ]),
        ]),
        factory.measure([factory.voice([])]),
        factory.measure([factory.voice([])]),
      ]),
    ]);
    score.tempo = 120;
    // Only 1 measure with content = 4 beats at 120 BPM = 2 seconds
    expect(getScoreDuration(score)).toBe(2);
  });

  it("respects score.tempo instead of stale global state", () => {
    const score = factory.score("", "", [
      factory.part("P", "P", [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.note("D", 4, factory.dur("quarter")),
            factory.note("E", 4, factory.dur("quarter")),
            factory.note("F", 4, factory.dur("quarter")),
          ]),
        ]),
      ]),
    ]);
    score.tempo = 60;
    // 4 quarter notes at 60 BPM = 4 seconds
    expect(getScoreDuration(score)).toBe(4);
  });
});
