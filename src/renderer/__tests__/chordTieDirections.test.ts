import { describe, it, expect } from "vitest";
import { computeChordTieDirections } from "../vexBridge";
import type { Pitch } from "../../model";

function heads(pitches: [string, number][]): { pitch: Pitch }[] {
  return pitches.map(([pc, oct]) => ({
    pitch: { pitchClass: pc as Pitch["pitchClass"], octave: oct as Pitch["octave"], accidental: "natural" },
  }));
}

describe("computeChordTieDirections", () => {
  it("returns empty map for a single tied head (default direction is fine)", () => {
    const h = heads([["C", 4], ["E", 4], ["G", 4]]);
    const d = computeChordTieDirections(h, [1]);
    expect(d.size).toBe(0);
  });

  it("splits 2 tied heads into top/up, bottom/down", () => {
    const h = heads([["C", 4], ["E", 4]]);
    const d = computeChordTieDirections(h, [0, 1]);
    expect(d.get(0)).toBe(1);  // C (bottom) → down
    expect(d.get(1)).toBe(-1); // E (top)    → up
  });

  it("splits 3 tied heads so top 2 curve up, bottom 1 curves down", () => {
    // C-E-G: without this split, E and C would both curve down and their arcs
    // would peak within ~10px of each other, visually merging into one tie.
    const h = heads([["C", 4], ["E", 4], ["G", 4]]);
    const d = computeChordTieDirections(h, [0, 1, 2]);
    expect(d.get(2)).toBe(-1); // G top → up
    expect(d.get(1)).toBe(-1); // E mid → up
    expect(d.get(0)).toBe(1);  // C bot → down
  });

  it("splits 4 tied heads evenly — top 2 up, bottom 2 down", () => {
    const h = heads([["C", 4], ["E", 4], ["G", 4], ["C", 5]]);
    const d = computeChordTieDirections(h, [0, 1, 2, 3]);
    expect(d.get(3)).toBe(-1); // C5 top → up
    expect(d.get(2)).toBe(-1); // G → up
    expect(d.get(1)).toBe(1);  // E → down
    expect(d.get(0)).toBe(1);  // C4 bot → down
  });

  it("only considers heads that are actually tied, not all heads", () => {
    // 3-head chord, only indices 0 and 2 are tied
    const h = heads([["C", 4], ["E", 4], ["G", 4]]);
    const d = computeChordTieDirections(h, [0, 2]);
    expect(d.get(2)).toBe(-1); // G top of tied → up
    expect(d.get(0)).toBe(1);  // C bot of tied → down
    expect(d.has(1)).toBe(false);
  });

  it("ignores model head order — splits by pitch", () => {
    // Heads in reverse order (G, E, C)
    const h = heads([["G", 4], ["E", 4], ["C", 4]]);
    const d = computeChordTieDirections(h, [0, 1, 2]);
    expect(d.get(0)).toBe(-1); // G (top by pitch) → up
    expect(d.get(1)).toBe(-1); // E → up
    expect(d.get(2)).toBe(1);  // C → down
  });
});
