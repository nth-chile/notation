import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";

function setupScore() {
  const score = factory.score("Test", "", [
    factory.part("Piano", "Pno.", [
      factory.measure([
        factory.voice([
          factory.note("C", 4, factory.dur("quarter")),
          factory.note("D", 4, factory.dur("quarter")),
        ]),
      ]),
    ]),
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
      noteEntry: false,
      insertMode: false,
      graceNoteMode: false,
      textInputMode: null,
      textInputBuffer: "",
      textInputInitialValue: "",
      pendingPitch: null,
    },
  }));
}

describe("toggleNoteEntry (#219)", () => {
  beforeEach(setupScore);

  it("switches noteEntry from false to true", () => {
    expect(useEditorStore.getState().inputState.noteEntry).toBe(false);
    useEditorStore.getState().toggleNoteEntry();
    expect(useEditorStore.getState().inputState.noteEntry).toBe(true);
  });

  it("switches noteEntry from true to false", () => {
    useEditorStore.getState().toggleNoteEntry(); // enter
    expect(useEditorStore.getState().inputState.noteEntry).toBe(true);
    useEditorStore.getState().toggleNoteEntry(); // exit
    expect(useEditorStore.getState().inputState.noteEntry).toBe(false);
  });

  it("clears insertMode when exiting note entry", () => {
    const store = useEditorStore.getState();
    store.toggleNoteEntry(); // enter
    store.toggleInsertMode(); // enable insert
    expect(useEditorStore.getState().inputState.insertMode).toBe(true);
    useEditorStore.getState().toggleNoteEntry(); // exit
    expect(useEditorStore.getState().inputState.insertMode).toBe(false);
  });

  it("clears graceNoteMode when exiting note entry", () => {
    useEditorStore.getState().toggleNoteEntry(); // enter
    useEditorStore.setState((s) => ({
      inputState: { ...s.inputState, graceNoteMode: true },
    }));
    expect(useEditorStore.getState().inputState.graceNoteMode).toBe(true);
    useEditorStore.getState().toggleNoteEntry(); // exit
    expect(useEditorStore.getState().inputState.graceNoteMode).toBe(false);
  });

  it("clears pendingPitch when exiting note entry", () => {
    useEditorStore.getState().toggleNoteEntry(); // enter
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        pendingPitch: { pitchClass: "C", octave: 4, accidental: "natural" },
      },
    }));
    useEditorStore.getState().toggleNoteEntry(); // exit
    expect(useEditorStore.getState().inputState.pendingPitch).toBeNull();
  });

  it("preserves insertMode when entering note entry", () => {
    // insertMode already false, entering shouldn't change it
    useEditorStore.getState().toggleNoteEntry(); // enter
    expect(useEditorStore.getState().inputState.insertMode).toBe(false);
  });
});

describe("note entry duration/accidental tracking (#219)", () => {
  beforeEach(setupScore);

  it("setDuration updates inputState.duration in note entry mode", () => {
    useEditorStore.getState().toggleNoteEntry();
    // Move cursor past existing events so setDuration only updates input state
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, eventIndex: 2 },
      },
    }));
    useEditorStore.getState().setDuration("eighth");
    expect(useEditorStore.getState().inputState.duration.type).toBe("eighth");
  });

  it("setAccidental updates inputState.accidental when no note at cursor", () => {
    useEditorStore.getState().toggleNoteEntry();
    // Move cursor past existing events
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, eventIndex: 2 },
      },
    }));
    useEditorStore.getState().setAccidental("sharp");
    expect(useEditorStore.getState().inputState.accidental).toBe("sharp");
  });

  it("toggling the same accidental resets to natural", () => {
    useEditorStore.getState().toggleNoteEntry();
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, eventIndex: 2 },
      },
    }));
    useEditorStore.getState().setAccidental("flat");
    useEditorStore.getState().setAccidental("flat");
    expect(useEditorStore.getState().inputState.accidental).toBe("natural");
  });
});
