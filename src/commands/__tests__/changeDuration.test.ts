import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { ChangeDuration } from "../ChangeDuration";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";
import { durationToTicks } from "../../model/duration";

function makeSnapshot(overrides?: {
  measures?: ReturnType<typeof factory.measure>[];
  cursor?: Partial<ReturnType<typeof defaultInputState>["cursor"]>;
}): EditorSnapshot {
  const measures = overrides?.measures ?? [
    factory.measure([factory.voice([])]),
  ];
  const input = defaultInputState();
  if (overrides?.cursor) {
    Object.assign(input.cursor, overrides.cursor);
  }
  return {
    score: factory.score("Test", "", [factory.part("P", "P", measures)]),
    inputState: input,
  };
}

describe("ChangeDuration shortening fills freed space with rests (#239)", () => {
  it("half → quarter inserts a quarter rest", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("half")),
            factory.note("E", 4, factory.dur("half")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe("note");
    expect(events[0].duration.type).toBe("quarter");
    expect(events[1].kind).toBe("rest");
    expect(events[1].duration.type).toBe("quarter");
    expect(events[2].kind).toBe("note");
    expect(events[2].duration.type).toBe("half");
  });

  it("whole → quarter inserts rests filling a dotted half (3 quarters)", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("C", 4, factory.dur("whole"))]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    // whole = 1920 ticks, quarter = 480 ticks, freed = 1440 ticks
    // 1440 = dotted half (1440) — single rest
    const totalFreedTicks = events
      .slice(1)
      .reduce((sum, e) => sum + durationToTicks(e.duration), 0);
    expect(totalFreedTicks).toBe(1440);
    expect(events[0].duration.type).toBe("quarter");
    // All filler events should be rests
    for (let i = 1; i < events.length; i++) {
      expect(events[i].kind).toBe("rest");
    }
  });

  it("whole → half inserts a half rest", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("C", 4, factory.dur("whole"))]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "half", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("half");
    expect(events[1].kind).toBe("rest");
    expect(events[1].duration.type).toBe("half");
  });

  it("quarter → eighth inserts an eighth rest", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("C", 4, factory.dur("quarter"))]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "eighth", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("eighth");
    expect(events[1].kind).toBe("rest");
    expect(events[1].duration.type).toBe("eighth");
  });

  it("dotted half → quarter inserts rests for the freed ticks", () => {
    // dotted half = 1440 ticks, quarter = 480, freed = 960 = half
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("C", 4, factory.dur("half", 1))]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    const totalFreedTicks = events
      .slice(1)
      .reduce((sum, e) => sum + durationToTicks(e.duration), 0);
    expect(totalFreedTicks).toBe(960); // half note worth of rests
    for (let i = 1; i < events.length; i++) {
      expect(events[i].kind).toBe("rest");
    }
  });
});

describe("ChangeDuration lengthening consumes trailing rests (#239)", () => {
  it("quarter → half consumes a trailing quarter rest", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.rest(factory.dur("quarter")),
            factory.note("E", 4, factory.dur("half")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "half", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    // The quarter rest should be consumed
    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("half");
    expect(events[1].kind).toBe("note");
    expect(events[1].duration.type).toBe("half");
  });

  it("does not consume trailing notes (only rests)", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.note("D", 4, factory.dur("quarter")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "half", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    // D4 is not a rest, so it stays; measure may be overfull
    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("half");
    expect(events[1].kind).toBe("note");
  });

  it("returns excess as rests when consuming more trailing rests than needed", () => {
    // quarter → dotted quarter needs 240 more ticks, but trailing half rest = 960 ticks
    // excess = 960 - 240 = 720 ticks = dotted quarter
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.rest(factory.dur("half")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 1 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    // The half rest (960) was consumed; needed 240; excess 720 returned as rest(s)
    expect(events[0].duration.type).toBe("quarter");
    expect(events[0].duration.dots).toBe(1);
    const excessTicks = events
      .slice(1)
      .reduce((sum, e) => sum + durationToTicks(e.duration), 0);
    expect(excessTicks).toBe(720);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].kind).toBe("rest");
    }
  });
});

describe("ChangeDuration same duration is a no-op for rests (#239)", () => {
  it("does not insert filler rests when duration is unchanged", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("quarter")),
            factory.note("D", 4, factory.dur("quarter")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 0 });
    const result = cmd.execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;

    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("quarter");
    expect(events[1].duration.type).toBe("quarter");
  });
});

describe("ChangeDuration undo restores original state (#239)", () => {
  it("undo returns the original events", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.note("C", 4, factory.dur("half")),
            factory.note("E", 4, factory.dur("half")),
          ]),
        ]),
      ],
    });
    const cmd = new ChangeDuration({ type: "quarter", dots: 0 });
    const result = cmd.execute(snap);
    const undone = cmd.undo(result);

    const events = undone.score.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(2);
    expect(events[0].duration.type).toBe("half");
    expect(events[1].duration.type).toBe("half");
  });
});
