import { describe, it, expect } from "vitest";
import { pitchToMidi, midiToPitch, stepUp, stepDown } from "../pitch";
import type { Pitch } from "../pitch";

describe("pitchToMidi", () => {
  it("converts middle C (C4) to 60", () => {
    expect(pitchToMidi({ pitchClass: "C", accidental: "natural", octave: 4 })).toBe(60);
  });

  it("converts A4 to 69", () => {
    expect(pitchToMidi({ pitchClass: "A", accidental: "natural", octave: 4 })).toBe(69);
  });

  it("handles sharp accidental", () => {
    expect(pitchToMidi({ pitchClass: "F", accidental: "sharp", octave: 4 })).toBe(66);
  });

  it("handles flat accidental", () => {
    expect(pitchToMidi({ pitchClass: "B", accidental: "flat", octave: 4 })).toBe(70);
  });

  it("handles double-sharp", () => {
    expect(pitchToMidi({ pitchClass: "C", accidental: "double-sharp", octave: 4 })).toBe(62);
  });

  it("handles double-flat", () => {
    expect(pitchToMidi({ pitchClass: "D", accidental: "double-flat", octave: 4 })).toBe(60);
  });

  it("converts C0 to 12", () => {
    expect(pitchToMidi({ pitchClass: "C", accidental: "natural", octave: 0 })).toBe(12);
  });

  it("enharmonic equivalence: C# = Db", () => {
    const cSharp = pitchToMidi({ pitchClass: "C", accidental: "sharp", octave: 4 });
    const dFlat = pitchToMidi({ pitchClass: "D", accidental: "flat", octave: 4 });
    expect(cSharp).toBe(dFlat);
  });
});

describe("midiToPitch", () => {
  it("converts 60 to C4", () => {
    const p = midiToPitch(60);
    expect(p.pitchClass).toBe("C");
    expect(p.octave).toBe(4);
    expect(p.accidental).toBe("natural");
  });

  it("converts 69 to A4", () => {
    const p = midiToPitch(69);
    expect(p.pitchClass).toBe("A");
    expect(p.octave).toBe(4);
  });

  it("converts black key 61 to C#4", () => {
    const p = midiToPitch(61);
    expect(p.pitchClass).toBe("C");
    expect(p.accidental).toBe("sharp");
    expect(p.octave).toBe(4);
  });

  it("converts black key 66 to F#4", () => {
    const p = midiToPitch(66);
    expect(p.pitchClass).toBe("F");
    expect(p.accidental).toBe("sharp");
  });

  it("round-trips all white keys in octave 4", () => {
    const whiteKeys: [string, number][] = [
      ["C", 60], ["D", 62], ["E", 64], ["F", 65], ["G", 67], ["A", 69], ["B", 71],
    ];
    for (const [pc, midi] of whiteKeys) {
      const p = midiToPitch(midi);
      expect(p.pitchClass).toBe(pc);
      expect(p.accidental).toBe("natural");
      expect(pitchToMidi(p)).toBe(midi);
    }
  });
});

describe("stepUp", () => {
  it("steps C to D", () => {
    const p: Pitch = { pitchClass: "C", accidental: "natural", octave: 4 };
    const result = stepUp(p);
    expect(result.pitchClass).toBe("D");
    expect(result.octave).toBe(4);
  });

  it("steps B to C with octave increase", () => {
    const p: Pitch = { pitchClass: "B", accidental: "natural", octave: 4 };
    const result = stepUp(p);
    expect(result.pitchClass).toBe("C");
    expect(result.octave).toBe(5);
  });

  it("clamps at octave 9", () => {
    const p: Pitch = { pitchClass: "B", accidental: "natural", octave: 9 };
    const result = stepUp(p);
    expect(result.pitchClass).toBe("C");
    expect(result.octave).toBe(9);
  });

  it("resets accidental to natural", () => {
    const p: Pitch = { pitchClass: "F", accidental: "sharp", octave: 4 };
    const result = stepUp(p);
    expect(result.pitchClass).toBe("G");
    expect(result.accidental).toBe("natural");
  });
});

describe("stepDown", () => {
  it("steps D to C", () => {
    const p: Pitch = { pitchClass: "D", accidental: "natural", octave: 4 };
    const result = stepDown(p);
    expect(result.pitchClass).toBe("C");
    expect(result.octave).toBe(4);
  });

  it("steps C to B with octave decrease", () => {
    const p: Pitch = { pitchClass: "C", accidental: "natural", octave: 4 };
    const result = stepDown(p);
    expect(result.pitchClass).toBe("B");
    expect(result.octave).toBe(3);
  });

  it("clamps at octave 0", () => {
    const p: Pitch = { pitchClass: "C", accidental: "natural", octave: 0 };
    const result = stepDown(p);
    expect(result.pitchClass).toBe("B");
    expect(result.octave).toBe(0);
  });

  it("resets accidental to natural", () => {
    const p: Pitch = { pitchClass: "B", accidental: "flat", octave: 4 };
    const result = stepDown(p);
    expect(result.pitchClass).toBe("A");
    expect(result.accidental).toBe("natural");
  });
});
