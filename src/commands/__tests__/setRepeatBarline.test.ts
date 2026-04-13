import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { SetRepeatBarline } from "../SetRepeatBarline";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

function makeSnapshot(partCount: number, measureCount: number, cursor?: Partial<ReturnType<typeof defaultInputState>["cursor"]>): EditorSnapshot {
  const parts = Array.from({ length: partCount }, (_, i) => {
    const measures = Array.from({ length: measureCount }, () =>
      factory.measure([factory.voice([factory.note("C", 4, factory.dur("quarter"))])]),
    );
    return factory.part(`Part ${i}`, `P${i}`, measures);
  });
  const input = defaultInputState();
  if (cursor) {
    Object.assign(input.cursor, cursor);
  }
  return {
    score: factory.score("Test", "", parts),
    inputState: input,
  };
}

describe("SetRepeatBarline", () => {
  it("sets repeat-end barline on the cursor measure across all parts", () => {
    const snap = makeSnapshot(3, 2);
    const cmd = new SetRepeatBarline("repeat-end");
    const result = cmd.execute(snap);

    for (const part of result.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("repeat-end");
    }
  });

  it("toggles off when the barline already matches", () => {
    const snap = makeSnapshot(2, 2);
    // First apply repeat-end
    const r1 = new SetRepeatBarline("repeat-end").execute(snap);
    // Apply again — should toggle back to single
    const r2 = new SetRepeatBarline("repeat-end").execute(r1);

    for (const part of r2.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("single");
    }
  });

  it("applies to the correct measure based on cursor position", () => {
    const snap = makeSnapshot(2, 3, { measureIndex: 2 });
    const cmd = new SetRepeatBarline("double");
    const result = cmd.execute(snap);

    // Measure 2 should have the barline
    for (const part of result.score.parts) {
      expect(part.measures[2].barlineEnd).toBe("double");
    }
    // Other measures unchanged
    for (const part of result.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("single");
      expect(part.measures[1].barlineEnd).toBe("single");
    }
  });

  it("syncs barlines even when parts started with different barlines", () => {
    const snap = makeSnapshot(3, 2);
    // Desync: give part 1 a different barline on measure 0
    snap.score.parts[1].measures[0].barlineEnd = "double";

    const cmd = new SetRepeatBarline("repeat-end");
    const result = cmd.execute(snap);

    // All parts should now have repeat-end on measure 0
    for (const part of result.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("repeat-end");
    }
  });

  it("uses cursor's part as reference for toggle logic", () => {
    const snap = makeSnapshot(2, 1, { partIndex: 0 });
    // Part 0 already has repeat-end, part 1 does not
    snap.score.parts[0].measures[0].barlineEnd = "repeat-end";
    snap.score.parts[1].measures[0].barlineEnd = "single";

    const cmd = new SetRepeatBarline("repeat-end");
    const result = cmd.execute(snap);

    // Cursor is on part 0 which already has repeat-end → toggle to single for ALL parts
    for (const part of result.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("single");
    }
  });

  it("sets repeat-start barline type", () => {
    const snap = makeSnapshot(2, 2);
    const cmd = new SetRepeatBarline("repeat-start");
    const result = cmd.execute(snap);

    for (const part of result.score.parts) {
      expect(part.measures[0].barlineEnd).toBe("repeat-start");
    }
  });

  it("sets final barline type", () => {
    const snap = makeSnapshot(2, 2, { measureIndex: 1 });
    const cmd = new SetRepeatBarline("final");
    const result = cmd.execute(snap);

    for (const part of result.score.parts) {
      expect(part.measures[1].barlineEnd).toBe("final");
    }
  });

  it("does not modify the original snapshot", () => {
    const snap = makeSnapshot(2, 2);
    const original0 = snap.score.parts[0].measures[0].barlineEnd;
    new SetRepeatBarline("repeat-end").execute(snap);

    expect(snap.score.parts[0].measures[0].barlineEnd).toBe(original0);
  });
});
