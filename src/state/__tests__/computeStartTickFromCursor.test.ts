import { describe, it, expect } from "vitest";
import { computeStartTickFromCursor } from "../playbackActions";
import { factory } from "../../model";
import type { Measure, Score, NoteEventId } from "../../model";
import type { BarlineType } from "../../model/time";

function makeMeasure(barlineEnd: BarlineType = "single", repeatTimes?: number): Measure {
  const m = factory.measure([factory.voice([])]);
  m.barlineEnd = barlineEnd;
  if (repeatTimes != null) m.repeatTimes = repeatTimes;
  return m;
}

function makeScore(measures: Measure[]): Score {
  return factory.score("T", "", [factory.part("P", "P", measures)]);
}

const MEAS_TICKS = 480 * 4; // 4/4 measure

describe("computeStartTickFromCursor", () => {
  it("linear score: tick is measureIndex * measureTicks", () => {
    const s = makeScore([makeMeasure(), makeMeasure(), makeMeasure()]);
    const tick = computeStartTickFromCursor(s, {
      partIndex: 0, measureIndex: 2, voiceIndex: 0, eventIndex: 0,
    });
    expect(tick).toBe(2 * MEAS_TICKS);
  });

  it("cursor in post-repeat measure skips past all repeat passes (×6 case from user report)", () => {
    // m0 is a repeat-end with ×6 (plays 6 times), then m1
    const s = makeScore([
      makeMeasure("repeat-end", 6),
      makeMeasure(),
    ]);
    const tick = computeStartTickFromCursor(s, {
      partIndex: 0, measureIndex: 1, voiceIndex: 0, eventIndex: 0,
    });
    // Before the fix, this returned 1 × 1920 (mid-repeat). Now it should be 6 × 1920.
    expect(tick).toBe(6 * MEAS_TICKS);
  });

  it("simple 2x repeat: cursor in the measure AFTER the repeat doubles the offset", () => {
    // m0 normal, m1 repeat-end (default 2x), m2 normal — order [0,1,0,1,2]
    const s = makeScore([makeMeasure(), makeMeasure("repeat-end"), makeMeasure()]);
    const tick = computeStartTickFromCursor(s, {
      partIndex: 0, measureIndex: 2, voiceIndex: 0, eventIndex: 0,
    });
    // 4 measures of repeat + to-m2 offset = 4 × MEAS_TICKS
    expect(tick).toBe(4 * MEAS_TICKS);
  });

  it("cursor at first occurrence of a repeated measure stays at first occurrence (not a later pass)", () => {
    // m0 repeat-end ×3 → order [0, 0, 0]. Cursor on m0 should give tick 0, not 2*MEAS_TICKS.
    const s = makeScore([makeMeasure("repeat-end", 3)]);
    const tick = computeStartTickFromCursor(s, {
      partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 0,
    });
    expect(tick).toBe(0);
  });

  it("adds event offset within the measure", () => {
    const m = factory.measure([
      factory.voice([
        { id: "e1" as NoteEventId, kind: "note", duration: { type: "quarter", dots: 0 }, head: { pitch: { pitchClass: "C", octave: 4, accidental: "natural" } } },
        { id: "e2" as NoteEventId, kind: "note", duration: { type: "quarter", dots: 0 }, head: { pitch: { pitchClass: "D", octave: 4, accidental: "natural" } } },
        { id: "e3" as NoteEventId, kind: "note", duration: { type: "quarter", dots: 0 }, head: { pitch: { pitchClass: "E", octave: 4, accidental: "natural" } } },
      ]),
    ]);
    const s = factory.score("T", "", [factory.part("P", "P", [m])]);
    const tick = computeStartTickFromCursor(s, {
      partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 2,
    });
    expect(tick).toBe(2 * 480); // two quarter notes in
  });
});
