import { describe, it, expect } from "vitest";
import { pitchToStaffY, staffYToPitch } from "../ScoreRenderer";
import type { PitchClass, Octave } from "../../model";

const STAFF_TOP = 100;

describe("pitchToStaffY / staffYToPitch (treble clef)", () => {
  it("places E4 on the bottom staff line", () => {
    // VexFlow: top line at staffTop+40, bottom line at staffTop+80
    const y = pitchToStaffY("E", 4, "treble", STAFF_TOP);
    expect(y).toBe(STAFF_TOP + 80);
  });

  it("places F5 on the top staff line", () => {
    const y = pitchToStaffY("F", 5, "treble", STAFF_TOP);
    expect(y).toBe(STAFF_TOP + 40);
  });

  it("places G5 in the top space (above the top line)", () => {
    const y = pitchToStaffY("G", 5, "treble", STAFF_TOP);
    expect(y).toBe(STAFF_TOP + 35);
  });

  it("places C4 below the staff (one ledger line)", () => {
    // C4 is two diatonic steps below E4 → +10 pixels (one full line spacing)
    const y = pitchToStaffY("C", 4, "treble", STAFF_TOP);
    expect(y).toBe(STAFF_TOP + 90);
  });

  it("round-trips natural pitches through staff Y", () => {
    const cases: [PitchClass, Octave][] = [
      ["C", 4], ["D", 4], ["E", 4], ["F", 4], ["G", 4],
      ["A", 4], ["B", 4], ["C", 5], ["D", 5], ["E", 5],
      ["F", 5], ["G", 5], ["A", 5], ["B", 5],
    ];
    for (const [pc, oct] of cases) {
      const y = pitchToStaffY(pc, oct, "treble", STAFF_TOP);
      const result = staffYToPitch(y, "treble", STAFF_TOP);
      expect(result.pitchClass).toBe(pc);
      expect(result.octave).toBe(oct);
    }
  });

  it("snaps to the nearest diatonic step on imprecise Y", () => {
    // E4 sits at STAFF_TOP+80; a click 1px above should still snap to E4.
    const result = staffYToPitch(STAFF_TOP + 79, "treble", STAFF_TOP);
    expect(result).toEqual({ pitchClass: "E", octave: 4 });

    // 3px above E4 (which is half a line spacing) should snap up to F4.
    const result2 = staffYToPitch(STAFF_TOP + 77, "treble", STAFF_TOP);
    expect(result2).toEqual({ pitchClass: "F", octave: 4 });
  });
});

describe("staffYToPitch (other clefs)", () => {
  it("treats the bass-clef bottom line as G2", () => {
    const result = staffYToPitch(STAFF_TOP + 80, "bass", STAFF_TOP);
    expect(result).toEqual({ pitchClass: "G", octave: 2 });
  });

  it("treats the alto-clef bottom line as D3", () => {
    const result = staffYToPitch(STAFF_TOP + 80, "alto", STAFF_TOP);
    expect(result).toEqual({ pitchClass: "D", octave: 3 });
  });

  it("treats the tenor-clef bottom line as B2", () => {
    const result = staffYToPitch(STAFF_TOP + 80, "tenor", STAFF_TOP);
    expect(result).toEqual({ pitchClass: "B", octave: 2 });
  });

  it("falls back to treble for unknown clef strings", () => {
    const result = staffYToPitch(STAFF_TOP + 80, "weird", STAFF_TOP);
    expect(result).toEqual({ pitchClass: "E", octave: 4 });
  });
});

describe("staffYToPitch clamping", () => {
  it("clamps to octave 0 for absurdly high Y values (far below staff)", () => {
    const result = staffYToPitch(STAFF_TOP + 9999, "treble", STAFF_TOP);
    expect(result.octave).toBe(0);
  });

  it("clamps to octave 9 for absurdly low Y values (far above staff)", () => {
    const result = staffYToPitch(STAFF_TOP - 9999, "treble", STAFF_TOP);
    expect(result.octave).toBe(9);
  });
});
