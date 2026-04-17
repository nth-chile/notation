import { describe, it, expect } from "vitest";
import { nearestTabString } from "../ScoreOverlay";

// Geometry matches VexFlow TabStave + ScoreRenderer:
//   line 0 (string 1) is at mp.y + 52 (4 line-spacings of headroom)
//   each line is 13px below the previous
// So string N is at mp.y + 52 + (N-1)*13
describe("nearestTabString", () => {
  const mpY = 100;

  it("returns 1 when click is on the top line (string 1, high-E)", () => {
    expect(nearestTabString(152, mpY, 6)).toBe(1);
  });

  it("returns 6 when click is on the bottom line (string 6, low-E)", () => {
    // line 5 Y = 100 + 52 + 5*13 = 217
    expect(nearestTabString(217, mpY, 6)).toBe(6);
  });

  it("snaps to the nearest string when between lines", () => {
    // Between string 2 (y=165) and string 3 (y=178): click at 170 is closer to 165 → string 2
    expect(nearestTabString(170, mpY, 6)).toBe(2);
    // Click at 175 is closer to 178 → string 3
    expect(nearestTabString(175, mpY, 6)).toBe(3);
  });

  it("clamps to string 1 when click is above the top line", () => {
    expect(nearestTabString(0, mpY, 6)).toBe(1);
    expect(nearestTabString(100, mpY, 6)).toBe(1);
  });

  it("clamps to last string when click is below the bottom line", () => {
    expect(nearestTabString(300, mpY, 6)).toBe(6);
  });

  it("respects numStrings for non-standard tunings (e.g. 4-string bass)", () => {
    // 4-string bass: lines 0-3 → strings 1-4
    expect(nearestTabString(300, mpY, 4)).toBe(4);
    expect(nearestTabString(217, mpY, 4)).toBe(4);
  });

  it("handles a 7-string guitar", () => {
    // line 6 Y = 100 + 52 + 6*13 = 230
    expect(nearestTabString(230, mpY, 7)).toBe(7);
  });
});
