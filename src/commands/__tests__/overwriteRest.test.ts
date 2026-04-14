import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { OverwriteRest } from "../OverwriteRest";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

function makeSnapshot(measures: ReturnType<typeof factory.measure>[], cursor?: Partial<ReturnType<typeof defaultInputState>["cursor"]>): EditorSnapshot {
  const input = defaultInputState();
  if (cursor) Object.assign(input.cursor, cursor);
  return {
    score: factory.score("Test", "", [factory.part("P", "P", measures)]),
    inputState: input,
  };
}

describe("OverwriteRest (#245)", () => {
  it("replaces the existing event at the cursor with a rest", () => {
    const m = factory.measure([
      factory.voice([
        factory.note("C", 4, factory.dur("quarter")),
        factory.note("D", 4, factory.dur("quarter")),
        factory.note("E", 4, factory.dur("quarter")),
      ]),
    ]);
    const snap = makeSnapshot([m], { eventIndex: 1 });
    const result = new OverwriteRest(factory.dur("quarter")).execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;
    expect(events.length).toBe(3); // count unchanged (replaced, not inserted)
    expect(events[0].kind).toBe("note");
    expect(events[1].kind).toBe("rest");
    expect(events[2].kind).toBe("note");
    expect(result.inputState.cursor.eventIndex).toBe(2); // advanced
  });

  it("appends when the cursor is past the last event", () => {
    const m = factory.measure([
      factory.voice([factory.note("C", 4, factory.dur("quarter"))]),
    ]);
    const snap = makeSnapshot([m], { eventIndex: 1 });
    const result = new OverwriteRest(factory.dur("quarter")).execute(snap);
    const events = result.score.parts[0].measures[0].voices[0].events;
    expect(events.length).toBe(2);
    expect(events[1].kind).toBe("rest");
  });

  it("returns state unchanged when measure is missing", () => {
    const snap = makeSnapshot([], { eventIndex: 0 });
    const result = new OverwriteRest(factory.dur("quarter")).execute(snap);
    expect(result).toBe(snap);
  });
});
