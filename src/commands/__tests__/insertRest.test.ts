import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { InsertRest } from "../InsertRest";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

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

describe("InsertRest", () => {
  it("inserts a rest at the cursor position in an empty measure", () => {
    const snap = makeSnapshot();
    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    const events = result.score.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("rest");
    expect(events[0].duration.type).toBe("quarter");
    expect(events[0].duration.dots).toBe(0);
  });

  it("inserts a rest between existing notes", () => {
    const m = factory.measure([
      factory.voice([
        factory.note("C", 4, factory.dur("quarter")),
        factory.note("D", 4, factory.dur("quarter")),
      ]),
    ]);
    const snap = makeSnapshot({ measures: [m], cursor: { eventIndex: 1 } });
    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    const events = result.score.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(3);
    expect(events[0].kind).toBe("note");
    expect(events[1].kind).toBe("rest");
    expect(events[1].duration.type).toBe("quarter");
    expect(events[2].kind).toBe("note");
  });

  it("advances cursor after inserting", () => {
    const snap = makeSnapshot();
    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    expect(result.inputState.cursor.eventIndex).toBe(1);
  });

  it("supports dotted rests", () => {
    const snap = makeSnapshot();
    const cmd = new InsertRest(factory.dur("half", 1));
    const result = cmd.execute(snap);

    const events = result.score.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("rest");
    expect(events[0].duration.type).toBe("half");
    expect(events[0].duration.dots).toBe(1);
  });

  it("auto-advances to next measure when current is full", () => {
    // Fill measure with 4 quarter notes (4/4 time)
    const m1 = factory.measure([
      factory.voice([
        factory.note("C", 4, factory.dur("quarter")),
        factory.note("D", 4, factory.dur("quarter")),
        factory.note("E", 4, factory.dur("quarter")),
        factory.note("F", 4, factory.dur("quarter")),
      ]),
    ]);
    const m2 = factory.measure([factory.voice([])]);

    const snap = makeSnapshot({
      measures: [m1, m2],
      cursor: { measureIndex: 0, eventIndex: 4 },
    });

    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    // Rest should land in measure 1
    expect(result.inputState.cursor.measureIndex).toBe(1);
    expect(result.score.parts[0].measures[1].voices[0].events).toHaveLength(1);
    expect(result.score.parts[0].measures[1].voices[0].events[0].kind).toBe("rest");
  });

  it("auto-appends a new measure when at the end of the last measure", () => {
    const m = factory.measure([
      factory.voice([
        factory.note("C", 4, factory.dur("whole")),
      ]),
    ]);
    const snap = makeSnapshot({
      measures: [m],
      cursor: { measureIndex: 0, eventIndex: 1 },
    });

    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    // A new measure should have been appended
    expect(result.score.parts[0].measures.length).toBeGreaterThan(1);
    expect(result.inputState.cursor.measureIndex).toBe(1);
  });

  it("inserts different duration rests", () => {
    for (const durType of ["whole", "half", "eighth", "16th"] as const) {
      const snap = makeSnapshot();
      const cmd = new InsertRest(factory.dur(durType));
      const result = cmd.execute(snap);
      expect(result.score.parts[0].measures[0].voices[0].events[0].duration.type).toBe(durType);
    }
  });

  it("returns state unchanged for invalid measure", () => {
    const snap = makeSnapshot({
      cursor: { measureIndex: 99 },
    });
    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);
    expect(result).toBe(snap);
  });

  it("inserts into the correct voice when multiple voices exist", () => {
    const v1 = factory.voice([factory.note("C", 4, factory.dur("quarter"))]);
    const v2 = factory.voice([]);
    const m = factory.measure([v1, v2]);
    const snap = makeSnapshot({
      measures: [m],
      cursor: { voiceIndex: 1, eventIndex: 0 },
    });

    const cmd = new InsertRest(factory.dur("quarter"));
    const result = cmd.execute(snap);

    // Voice 0 untouched
    expect(result.score.parts[0].measures[0].voices[0].events).toHaveLength(1);
    expect(result.score.parts[0].measures[0].voices[0].events[0].kind).toBe("note");
    // Voice 1 has the rest
    expect(result.score.parts[0].measures[0].voices[1].events).toHaveLength(1);
    expect(result.score.parts[0].measures[0].voices[1].events[0].kind).toBe("rest");
  });
});
