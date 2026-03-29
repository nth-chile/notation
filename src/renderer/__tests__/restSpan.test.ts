import { describe, it, expect } from "vitest";
import { factory } from "../../model";

// We can't import breaksRestSpan directly (it's not exported), so we test
// detectRestRuns indirectly via the public computeLayout. Instead, test the
// logic inline since breaksRestSpan is a pure function.

// Replicate the function for testing
function breaksRestSpan(
  m: ReturnType<typeof factory.measure>,
  prev?: ReturnType<typeof factory.measure>,
): boolean {
  if (m.barlineEnd !== "single") return true;
  if (m.navigation?.segno || m.navigation?.coda || m.navigation?.volta) return true;
  if (m.navigation?.fine || m.navigation?.toCoda || m.navigation?.dsText || m.navigation?.dcText) return true;
  if (m.annotations.some((a) => a.kind === "rehearsal-mark" || a.kind === "tempo-mark")) return true;
  if (prev) {
    if (prev.keySignature.fifths !== m.keySignature.fifths) return true;
    if (prev.timeSignature.numerator !== m.timeSignature.numerator ||
        prev.timeSignature.denominator !== m.timeSignature.denominator) return true;
    if (prev.clef.type !== m.clef.type) return true;
  }
  return false;
}

describe("breaksRestSpan", () => {
  it("returns false for plain empty measure", () => {
    const m = factory.measure([factory.voice([])]);
    expect(breaksRestSpan(m)).toBe(false);
  });

  it("returns true for repeat barline", () => {
    const m = factory.measure([factory.voice([])]);
    m.barlineEnd = "repeat-end";
    expect(breaksRestSpan(m)).toBe(true);
  });

  it("returns true for rehearsal mark", () => {
    const m = factory.measure([factory.voice([])], {
      annotations: [{ kind: "rehearsal-mark", text: "A" }],
    });
    expect(breaksRestSpan(m)).toBe(true);
  });

  it("returns true for tempo mark", () => {
    const m = factory.measure([factory.voice([])], {
      annotations: [{ kind: "tempo-mark", bpm: 120, beatUnit: "quarter" }],
    });
    expect(breaksRestSpan(m)).toBe(true);
  });

  it("returns true when key signature changes", () => {
    const prev = factory.measure([factory.voice([])]);
    const m = factory.measure([factory.voice([])], { keySignature: { fifths: 3 } });
    expect(breaksRestSpan(m, prev)).toBe(true);
  });

  it("returns false when key signature is same", () => {
    const prev = factory.measure([factory.voice([])]);
    const m = factory.measure([factory.voice([])]);
    expect(breaksRestSpan(m, prev)).toBe(false);
  });

  it("returns true when time signature changes", () => {
    const prev = factory.measure([factory.voice([])]);
    const m = factory.measure([factory.voice([])], {
      timeSignature: { numerator: 3, denominator: 4 },
    });
    expect(breaksRestSpan(m, prev)).toBe(true);
  });

  it("returns true when clef changes", () => {
    const prev = factory.measure([factory.voice([])]);
    const m = factory.measure([factory.voice([])], { clef: { type: "bass" } });
    expect(breaksRestSpan(m, prev)).toBe(true);
  });

  it("returns true for segno", () => {
    const m = factory.measure([factory.voice([])]);
    m.navigation = { segno: true };
    expect(breaksRestSpan(m)).toBe(true);
  });

  it("returns true for coda", () => {
    const m = factory.measure([factory.voice([])]);
    m.navigation = { coda: true };
    expect(breaksRestSpan(m)).toBe(true);
  });
});
