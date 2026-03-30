import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { InsertNote } from "../InsertNote";
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

describe("InsertNote voice auto-creation", () => {
  it("auto-creates voice when voiceIndex exceeds existing voices", () => {
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([])])],
      cursor: { voiceIndex: 1, eventIndex: 0 },
    });

    // Only voice 0 exists — inserting at voiceIndex 1 should create it
    const cmd = new InsertNote("C", 4, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    expect(result.score.parts[0].measures[0].voices).toHaveLength(2);
    expect(result.score.parts[0].measures[0].voices[1].events).toHaveLength(1);
    expect(result.score.parts[0].measures[0].voices[1].events[0].kind).toBe("note");
  });

  it("auto-creates multiple intermediate voices", () => {
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([])])],
      cursor: { voiceIndex: 3, eventIndex: 0 },
    });

    const cmd = new InsertNote("D", 4, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    // Should have voices 0, 1, 2, 3
    expect(result.score.parts[0].measures[0].voices).toHaveLength(4);
    // Intermediate voices are empty
    expect(result.score.parts[0].measures[0].voices[1].events).toHaveLength(0);
    expect(result.score.parts[0].measures[0].voices[2].events).toHaveLength(0);
    // Target voice has the note
    expect(result.score.parts[0].measures[0].voices[3].events).toHaveLength(1);
  });

  it("does not duplicate voices when voice already exists", () => {
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([]), factory.voice([])])],
      cursor: { voiceIndex: 1, eventIndex: 0 },
    });

    const cmd = new InsertNote("E", 4, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    expect(result.score.parts[0].measures[0].voices).toHaveLength(2);
    expect(result.score.parts[0].measures[0].voices[1].events).toHaveLength(1);
  });
});
