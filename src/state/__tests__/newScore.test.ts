import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";
import { emptyScore } from "../../model/factory";

function setupWithContent() {
  const score = factory.score("My Song", "Composer", [
    factory.part("Piano", "Pno.", [
      factory.measure([
        factory.voice([
          factory.note("C", 4, factory.dur("quarter")),
          factory.note("D", 4, factory.dur("quarter")),
          factory.note("E", 4, factory.dur("quarter")),
          factory.note("F", 4, factory.dur("quarter")),
        ]),
      ]),
    ]),
  ]);
  useEditorStore.setState({
    score,
    filePath: "/path/to/file.musicxml",
    inputState: {
      ...useEditorStore.getState().inputState,
      cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 2, staveIndex: 0 },
    },
  });
}

describe("New score (reset)", () => {
  beforeEach(setupWithContent);

  it("replaces the score with an empty one", () => {
    const store = useEditorStore.getState();
    expect(store.score.title).toBe("My Song");
    expect(store.score.parts[0].measures[0].voices[0].events).toHaveLength(4);

    // Simulate handleNew
    useEditorStore.getState().setScore(emptyScore());
    useEditorStore.getState().setFilePath(null);

    const after = useEditorStore.getState();
    expect(after.score.title).toBe("");
    expect(after.filePath).toBeNull();
  });

  it("emptyScore has 4 empty measures", () => {
    const score = emptyScore();
    expect(score.parts).toHaveLength(1);
    expect(score.parts[0].measures).toHaveLength(4);
    for (const m of score.parts[0].measures) {
      expect(m.voices[0].events).toHaveLength(0);
    }
  });

  it("emptyScore part is named Part 1", () => {
    const score = emptyScore();
    expect(score.parts[0].name).toBe("Piano");
    expect(score.parts[0].abbreviation).toBe("Pno.");
  });

  it("clears filePath", () => {
    expect(useEditorStore.getState().filePath).toBe("/path/to/file.musicxml");
    useEditorStore.getState().setFilePath(null);
    expect(useEditorStore.getState().filePath).toBeNull();
  });

  it("resets inputState to defaults", () => {
    // Set up non-default input state
    useEditorStore.setState({
      inputState: {
        ...useEditorStore.getState().inputState,
        duration: { type: "16th", dots: 1 },
        accidental: "sharp",
        accidentalExplicit: true,
        noteEntry: true,
        insertMode: true,
        graceNoteMode: true,
        cursor: { partIndex: 0, measureIndex: 3, voiceIndex: 1, eventIndex: 5, staveIndex: 1 },
      },
    });

    useEditorStore.getState().setScore(emptyScore());

    const after = useEditorStore.getState().inputState;
    expect(after.duration).toEqual({ type: "quarter", dots: 0 });
    expect(after.accidental).toBe("natural");
    expect(after.accidentalExplicit).toBe(false);
    expect(after.noteEntry).toBe(false);
    expect(after.insertMode).toBe(false);
    expect(after.graceNoteMode).toBe(false);
    expect(after.cursor.partIndex).toBe(0);
    expect(after.cursor.measureIndex).toBe(0);
    expect(after.cursor.voiceIndex).toBe(0);
    expect(after.cursor.eventIndex).toBe(0);
    expect(after.cursor.staveIndex).toBe(0);
  });
});
