import { describe, it, expect } from "vitest";
import { ToggleTie } from "../ToggleTie";
import { factory } from "../../model";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";
import type { NoteEventId } from "../../model";

function snap(events: any[]): EditorSnapshot {
  const score = factory.score("T", "", [
    factory.part("P", "P", [factory.measure([factory.voice(events)])]),
  ]);
  const inputState = defaultInputState();
  return { score, inputState };
}

function mkChord(id: string, tiedHeads: boolean[] = [false, false, false]) {
  return {
    id: id as NoteEventId,
    kind: "chord" as const,
    duration: { type: "quarter" as const, dots: 0 },
    heads: [
      { pitch: { pitchClass: "C" as const, octave: 4 as const, accidental: "natural" as const }, tied: tiedHeads[0] || undefined },
      { pitch: { pitchClass: "E" as const, octave: 4 as const, accidental: "natural" as const }, tied: tiedHeads[1] || undefined },
      { pitch: { pitchClass: "G" as const, octave: 4 as const, accidental: "natural" as const }, tied: tiedHeads[2] || undefined },
    ],
  };
}

describe("ToggleTie on a chord", () => {
  it("ties every head when the chord has no ties yet", () => {
    const s = snap([mkChord("c1"), mkChord("c2")]);
    const cmd = new ToggleTie();
    const result = cmd.execute(s);
    const chord = result.score.parts[0].measures[0].voices[0].events[0] as ReturnType<typeof mkChord>;
    expect(chord.heads.every((h) => h.tied === true)).toBe(true);
  });

  it("ties every head when the chord has only some heads tied (mixed → all)", () => {
    const s = snap([mkChord("c1", [true, false, false]), mkChord("c2")]);
    const cmd = new ToggleTie();
    const result = cmd.execute(s);
    const chord = result.score.parts[0].measures[0].voices[0].events[0] as ReturnType<typeof mkChord>;
    expect(chord.heads.map((h) => h.tied)).toEqual([true, true, true]);
  });

  it("unties every head when all heads are already tied", () => {
    const s = snap([mkChord("c1", [true, true, true]), mkChord("c2")]);
    const cmd = new ToggleTie();
    const result = cmd.execute(s);
    const chord = result.score.parts[0].measures[0].voices[0].events[0] as ReturnType<typeof mkChord>;
    expect(chord.heads.every((h) => h.tied == null)).toBe(true);
  });
});
