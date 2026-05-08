import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";

function setupEmpty() {
  const score = factory.score("Test", "", [
    factory.part("Piano", "Pno.", [factory.measure([factory.voice([])])]),
  ]);
  useEditorStore.setState((s) => ({
    score,
    inputState: {
      ...s.inputState,
      duration: { type: "quarter", dots: 0 },
      accidental: "natural",
      accidentalExplicit: false,
      voice: 0,
      cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 0, staveIndex: 0 },
      octave: 4,
      noteEntry: true,
      insertMode: false,
      graceNoteMode: false,
      pendingPitch: null,
      pitchBeforeDuration: false,
    },
  }));
}

describe("insertNote(pitchClass, explicitOctave)", () => {
  beforeEach(setupEmpty);

  it("uses the explicit octave when provided", () => {
    useEditorStore.getState().insertNote("C", 6);
    const ev = useEditorStore.getState().score.parts[0].measures[0].voices[0].events[0];
    expect(ev.kind).toBe("note");
    if (ev.kind !== "note") throw new Error("not a note");
    expect(ev.head.pitch.pitchClass).toBe("C");
    expect(ev.head.pitch.octave).toBe(6);
  });

  it("falls back to smartOctave when no explicit octave is given", () => {
    // smartOctave defaults to clef-default (octave 4 for treble) on an empty voice.
    useEditorStore.getState().insertNote("C");
    const ev = useEditorStore.getState().score.parts[0].measures[0].voices[0].events[0];
    if (ev.kind !== "note") throw new Error("not a note");
    expect(ev.head.pitch.octave).toBe(4);
  });

  it("respects the explicit octave when overwriting an existing event", () => {
    // Insert at octave 4, then overwrite at the same cursor with octave 5.
    useEditorStore.getState().insertNote("C", 4);
    useEditorStore.setState((s) => ({
      inputState: { ...s.inputState, cursor: { ...s.inputState.cursor, eventIndex: 0 } },
    }));
    useEditorStore.getState().insertNote("D", 5);
    const ev = useEditorStore.getState().score.parts[0].measures[0].voices[0].events[0];
    if (ev.kind !== "note") throw new Error("not a note");
    expect(ev.head.pitch.pitchClass).toBe("D");
    expect(ev.head.pitch.octave).toBe(5);
  });
});
