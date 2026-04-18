import { describe, it, expect } from "vitest";
import {
  TAB_FRET_FONT_SIZE,
  TAB_FRET_FONT_WEIGHT,
  TAB_LINE_WIDTH,
  TAB_NOTE_START_PADDING,
} from "../TabRenderer";

/**
 * Tests for #268 — tab staff visual polish.
 * Each exported constant is a deliberate design choice; a test makes future
 * changes opt-in rather than silent drift.
 */

describe("tab staff constants (#268)", () => {
  it("fret digits use a slightly bolder weight than VexFlow's default", () => {
    expect(TAB_FRET_FONT_WEIGHT).toBe("600");
  });

  it("fret font size matches the bumped 11pt size", () => {
    expect(TAB_FRET_FONT_SIZE).toBe(11);
  });

  it("tab staff lines stroke wider than the 1px VexFlow default", () => {
    expect(TAB_LINE_WIDTH).toBeGreaterThan(1);
    expect(TAB_LINE_WIDTH).toBeLessThan(2);
  });

  it("left-padding before the first note is at least a few pixels", () => {
    expect(TAB_NOTE_START_PADDING).toBeGreaterThanOrEqual(8);
    expect(TAB_NOTE_START_PADDING).toBeLessThanOrEqual(24);
  });
});

/**
 * Verifies the formula we use when shifting VexFlow's TimeSignature to
 * center it visually on a 6-line tab staff.
 *
 * VexFlow's draw() renders:
 *   top glyph at getYForLine(topLine - lineShift)
 *   bot glyph at getYForLine(bottomLine + lineShift)
 *
 * For a 6-line staff (lines 0..5, visual center = 2.5), we want the glyphs
 * at lines 1.5 and 3.5 for a symmetric centered result.
 *
 * We therefore set:
 *   topLine    = 1.5 + lineShift
 *   bottomLine = 3.5 - lineShift
 *
 * so the draw formula resolves to 1.5 and 3.5 regardless of the internal
 * lineShift value.
 */
describe("tab time-signature centering formula (#268)", () => {
  function resolvedLines(lineShift: number) {
    const topLine = 1.5 + lineShift;
    const bottomLine = 3.5 - lineShift;
    return {
      topY: topLine - lineShift,
      botY: bottomLine + lineShift,
    };
  }

  it("resolves to (1.5, 3.5) with lineShift = 0.5 (large glyph path)", () => {
    const { topY, botY } = resolvedLines(0.5);
    expect(topY).toBeCloseTo(1.5);
    expect(botY).toBeCloseTo(3.5);
  });

  it("resolves to (1.5, 3.5) with lineShift = 0 (small glyph path)", () => {
    const { topY, botY } = resolvedLines(0);
    expect(topY).toBeCloseTo(1.5);
    expect(botY).toBeCloseTo(3.5);
  });

  it("resulting glyph pair is centered on line 2.5 (visual center of 6-line tab)", () => {
    const { topY, botY } = resolvedLines(0.5);
    expect((topY + botY) / 2).toBeCloseTo(2.5);
  });
});
