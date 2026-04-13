import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { InsertNote } from "../InsertNote";
import { OverwriteNote } from "../OverwriteNote";
import { InsertModeNote } from "../InsertModeNote";
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

describe("InsertNote voice/staff resolution", () => {
  it("creates a new voice on the target staff when none exists (grand staff)", () => {
    // Measure has only a treble voice; cursor is on the bass staff.
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([])])],
      cursor: { voiceIndex: 0, eventIndex: 0, staveIndex: 1 },
    });

    const cmd = new InsertNote("C", 4, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    const voices = result.score.parts[0].measures[0].voices;
    // A new bass-staff voice was created; treble voice untouched.
    expect(voices).toHaveLength(2);
    expect(voices[0].events).toHaveLength(0);
    expect((voices[1].staff ?? 0)).toBe(1);
    expect(voices[1].events).toHaveLength(1);
    expect(voices[1].events[0].kind).toBe("note");
    // Cursor is now pointing at the bass voice.
    expect(result.inputState.cursor.voiceIndex).toBe(1);
  });

  it("reuses an existing voice on the target staff", () => {
    const trebleVoice = factory.voice([]);
    const bassVoice = { ...factory.voice([]), staff: 1 };
    const snap = makeSnapshot({
      measures: [factory.measure([trebleVoice, bassVoice])],
      cursor: { voiceIndex: 0, eventIndex: 0, staveIndex: 1 },
    });

    const cmd = new InsertNote("D", 3, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    const voices = result.score.parts[0].measures[0].voices;
    expect(voices).toHaveLength(2);
    expect(voices[0].events).toHaveLength(0);
    expect(voices[1].events).toHaveLength(1);
    expect(result.inputState.cursor.voiceIndex).toBe(1);
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

describe("OverwriteNote voice/staff resolution", () => {
  it("creates a new voice on the bass staff when overwriting from bass cursor", () => {
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([
        factory.note("C", 4, factory.dur("quarter")),
      ])])],
      cursor: { voiceIndex: 0, eventIndex: 0, staveIndex: 1 },
    });

    const cmd = new OverwriteNote("D", 3, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    const voices = result.score.parts[0].measures[0].voices;
    expect(voices).toHaveLength(2);
    // Treble voice untouched
    expect(voices[0].events[0].kind).toBe("note");
    // Bass voice created with the new note
    expect((voices[1].staff ?? 0)).toBe(1);
    expect(voices[1].events).toHaveLength(1);
    expect(result.inputState.cursor.voiceIndex).toBe(1);
  });

  it("reuses existing bass voice when overwriting", () => {
    const bassVoice = { ...factory.voice([
      factory.note("E", 3, factory.dur("quarter")),
    ]), staff: 1 };
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([
        factory.note("C", 4, factory.dur("quarter")),
      ]), bassVoice])],
      cursor: { voiceIndex: 0, eventIndex: 0, staveIndex: 1 },
    });

    const cmd = new OverwriteNote("D", 3, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    const voices = result.score.parts[0].measures[0].voices;
    expect(voices).toHaveLength(2);
    // Bass voice overwritten
    expect(voices[1].events[0]).toMatchObject({ kind: "note" });
    expect(result.inputState.cursor.voiceIndex).toBe(1);
  });
});

describe("InsertModeNote voice/staff resolution", () => {
  it("creates a new voice on the bass staff in insert mode", () => {
    const snap = makeSnapshot({
      measures: [factory.measure([factory.voice([])])],
      cursor: { voiceIndex: 0, eventIndex: 0, staveIndex: 1 },
    });

    const cmd = new InsertModeNote("C", 3, "natural", factory.dur("quarter"));
    const result = cmd.execute(snap);

    const voices = result.score.parts[0].measures[0].voices;
    expect(voices).toHaveLength(2);
    expect(voices[0].events).toHaveLength(0);
    expect((voices[1].staff ?? 0)).toBe(1);
    expect(voices[1].events).toHaveLength(1);
    expect(result.inputState.cursor.voiceIndex).toBe(1);
  });
});
