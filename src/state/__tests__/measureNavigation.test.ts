import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";

function setupScore(measureCount: number) {
  const measures = Array.from({ length: measureCount }, () =>
    factory.measure([factory.voice([factory.note("C", 4, factory.dur("quarter"))])]),
  );
  const score = factory.score("Test", "", [
    factory.part("Piano", "Pno.", measures, "piano"),
  ]);
  useEditorStore.setState({
    score,
    inputState: {
      ...useEditorStore.getState().inputState,
      cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 0, staveIndex: 0 },
    },
  });
}

describe("moveCursorToMeasure", () => {
  beforeEach(() => setupScore(4));

  it("advances to the next measure", () => {
    useEditorStore.getState().moveCursorToMeasure("next");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(1);
    expect(cursor.eventIndex).toBe(0);
  });

  it("advances multiple times", () => {
    useEditorStore.getState().moveCursorToMeasure("next");
    useEditorStore.getState().moveCursorToMeasure("next");
    useEditorStore.getState().moveCursorToMeasure("next");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(3);
  });

  it("does not advance past the last measure", () => {
    // Move to last measure
    useEditorStore.getState().moveCursorToMeasure("next");
    useEditorStore.getState().moveCursorToMeasure("next");
    useEditorStore.getState().moveCursorToMeasure("next");
    // Try to go past
    useEditorStore.getState().moveCursorToMeasure("next");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(3);
  });

  it("retreats to the previous measure", () => {
    // Start at measure 2
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, measureIndex: 2, eventIndex: 0 },
      },
    }));

    useEditorStore.getState().moveCursorToMeasure("prev");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(1);
    expect(cursor.eventIndex).toBe(0);
  });

  it("does not retreat before the first measure", () => {
    useEditorStore.getState().moveCursorToMeasure("prev");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(0);
  });

  it("resets eventIndex to 0 when moving next", () => {
    // Set eventIndex to something non-zero
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, measureIndex: 0, eventIndex: 3 },
      },
    }));

    useEditorStore.getState().moveCursorToMeasure("next");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(1);
    expect(cursor.eventIndex).toBe(0);
  });

  it("resets eventIndex to 0 when moving prev", () => {
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, measureIndex: 2, eventIndex: 5 },
      },
    }));

    useEditorStore.getState().moveCursorToMeasure("prev");
    const cursor = useEditorStore.getState().inputState.cursor;
    expect(cursor.measureIndex).toBe(1);
    expect(cursor.eventIndex).toBe(0);
  });

  it("clears lastEnteredPosition on navigation", () => {
    useEditorStore.setState({ lastEnteredPosition: { measureIndex: 0, eventIndex: 0 } as any });
    useEditorStore.getState().moveCursorToMeasure("next");
    expect(useEditorStore.getState().lastEnteredPosition).toBeNull();
  });

  it("works with a single-measure score (no movement possible)", () => {
    setupScore(1);
    useEditorStore.getState().moveCursorToMeasure("next");
    expect(useEditorStore.getState().inputState.cursor.measureIndex).toBe(0);

    useEditorStore.getState().moveCursorToMeasure("prev");
    expect(useEditorStore.getState().inputState.cursor.measureIndex).toBe(0);
  });
});
