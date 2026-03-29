import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";

function resetStore() {
  const score = factory.score("Test", "", [
    factory.part("P", "P", [
      factory.measure([
        factory.voice([
          factory.note("C", 4, factory.dur("quarter")),
          factory.note("D", 4, factory.dur("quarter")),
          factory.note("E", 4, factory.dur("quarter")),
          factory.note("F", 4, factory.dur("quarter")),
        ]),
      ]),
      factory.measure([factory.voice([])]),
    ]),
  ]);
  useEditorStore.setState({
    score,
    selection: null,
    noteSelection: null,
    inputState: {
      ...useEditorStore.getState().inputState,
      cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 0 },
    },
  });
}

describe("Note-level selection", () => {
  beforeEach(resetStore);

  it("selectNoteAtCursor creates a single-note selection", () => {
    useEditorStore.getState().selectNoteAtCursor();
    const ns = useEditorStore.getState().noteSelection;
    expect(ns).not.toBeNull();
    expect(ns!.startEvent).toBe(0);
    expect(ns!.endEvent).toBe(0);
    expect(ns!.measureIndex).toBe(0);
  });

  it("selectNoteAtCursor clears measure selection", () => {
    useEditorStore.setState({ selection: { partIndex: 0, measureStart: 0, measureEnd: 1 } });
    useEditorStore.getState().selectNoteAtCursor();
    expect(useEditorStore.getState().selection).toBeNull();
    expect(useEditorStore.getState().noteSelection).not.toBeNull();
  });

  it("setNoteSelection clears measure selection", () => {
    useEditorStore.setState({ selection: { partIndex: 0, measureStart: 0, measureEnd: 1 } });
    useEditorStore.getState().setNoteSelection({
      partIndex: 0, measureIndex: 0, voiceIndex: 0, startEvent: 0, endEvent: 2,
    });
    expect(useEditorStore.getState().selection).toBeNull();
  });

  it("setSelection clears note selection", () => {
    useEditorStore.getState().setNoteSelection({
      partIndex: 0, measureIndex: 0, voiceIndex: 0, startEvent: 0, endEvent: 2,
    });
    useEditorStore.getState().setSelection({ partIndex: 0, measureStart: 0, measureEnd: 1 });
    expect(useEditorStore.getState().noteSelection).toBeNull();
  });

  it("extendNoteSelection extends right", () => {
    useEditorStore.getState().selectNoteAtCursor();
    useEditorStore.getState().extendNoteSelection("right");
    const ns = useEditorStore.getState().noteSelection!;
    expect(ns.startEvent).toBe(0);
    expect(ns.endEvent).toBe(1);
  });

  it("extendNoteSelection extends left from later position", () => {
    useEditorStore.setState((s) => ({
      inputState: { ...s.inputState, cursor: { ...s.inputState.cursor, eventIndex: 2 } },
    }));
    useEditorStore.getState().selectNoteAtCursor();
    useEditorStore.getState().extendNoteSelection("left");
    const ns = useEditorStore.getState().noteSelection!;
    expect(ns.startEvent).toBe(1);
    expect(ns.endEvent).toBe(2);
  });

  it("extendNoteSelection does not go below 0", () => {
    useEditorStore.getState().selectNoteAtCursor();
    useEditorStore.getState().extendNoteSelection("left");
    const ns = useEditorStore.getState().noteSelection!;
    expect(ns.startEvent).toBe(0);
  });

  it("extendNoteSelection does not go past last event", () => {
    useEditorStore.setState((s) => ({
      inputState: { ...s.inputState, cursor: { ...s.inputState.cursor, eventIndex: 3 } },
    }));
    useEditorStore.getState().selectNoteAtCursor();
    useEditorStore.getState().extendNoteSelection("right");
    const ns = useEditorStore.getState().noteSelection!;
    expect(ns.endEvent).toBe(3);
  });

  it("deleteNoteSelection removes selected events", () => {
    useEditorStore.getState().setNoteSelection({
      partIndex: 0, measureIndex: 0, voiceIndex: 0, startEvent: 1, endEvent: 2,
    });
    useEditorStore.getState().deleteNoteSelection();

    const events = useEditorStore.getState().score.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(2);
    // C and F remain (D and E deleted)
    if (events[0].kind === "note") expect(events[0].head.pitch.pitchClass).toBe("C");
    if (events[1].kind === "note") expect(events[1].head.pitch.pitchClass).toBe("F");
    expect(useEditorStore.getState().noteSelection).toBeNull();
  });

  it("deleteNoteSelection adjusts cursor", () => {
    useEditorStore.getState().setNoteSelection({
      partIndex: 0, measureIndex: 0, voiceIndex: 0, startEvent: 2, endEvent: 3,
    });
    useEditorStore.getState().deleteNoteSelection();
    expect(useEditorStore.getState().inputState.cursor.eventIndex).toBe(2);
  });

  it("setDuration with noteSelection changes selected event durations", () => {
    useEditorStore.getState().setNoteSelection({
      partIndex: 0, measureIndex: 0, voiceIndex: 0, startEvent: 0, endEvent: 1,
    });
    useEditorStore.getState().setDuration("half");

    const events = useEditorStore.getState().score.parts[0].measures[0].voices[0].events;
    expect(events[0].duration.type).toBe("half");
    expect(events[1].duration.type).toBe("half");
    expect(events[2].duration.type).toBe("quarter"); // unchanged
  });

  it("does nothing when selecting past end of voice", () => {
    useEditorStore.setState((s) => ({
      inputState: { ...s.inputState, cursor: { ...s.inputState.cursor, eventIndex: 10 } },
    }));
    useEditorStore.getState().selectNoteAtCursor();
    expect(useEditorStore.getState().noteSelection).toBeNull();
  });
});
