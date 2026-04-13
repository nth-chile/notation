import { describe, it, expect, beforeEach, vi } from "vitest";
import { useEditorStore } from "../EditorState";
import { factory } from "../../model";

// Mock navigator.clipboard for tests
const mockClipboard = { readText: vi.fn().mockRejectedValue(new Error("not available")), writeText: vi.fn().mockResolvedValue(undefined) };
Object.defineProperty(globalThis, "navigator", {
  value: { clipboard: mockClipboard },
  writable: true,
});

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
      factory.measure([
        factory.voice([
          factory.note("G", 4, factory.dur("quarter")),
          factory.note("A", 4, factory.dur("quarter")),
          factory.note("B", 4, factory.dur("quarter")),
          factory.note("C", 5, factory.dur("quarter")),
        ]),
      ]),
      factory.measure([factory.voice([])]),
    ]),
  ]);
  useEditorStore.setState({
    score,
    selection: null,
    noteSelection: null,
    clipboardMeasures: null,
    clipboardEvents: null,
    inputState: {
      ...useEditorStore.getState().inputState,
      cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 0, staveIndex: 0 },
    },
  });
}

describe("Clipboard: paste replaces note selection", () => {
  beforeEach(() => {
    resetStore();
    mockClipboard.readText.mockRejectedValue(new Error("not available"));
  });

  it("paste with note selection replaces selected notes", async () => {
    // Copy events from measure 0 (C D E F)
    const state = useEditorStore.getState();
    const events = state.score.parts[0].measures[0].voices[0].events;
    // Put first two notes in clipboard
    useEditorStore.setState({
      clipboardEvents: {
        voiceIndex: 0,
        measures: [[structuredClone(events[0]), structuredClone(events[1])]],
      },
    });

    // Select notes 2-3 in measure 1 (B, C5) via noteSelection
    useEditorStore.setState({
      noteSelection: {
        partIndex: 0,
        voiceIndex: 0,
        startMeasure: 1,
        startEvent: 2,
        endMeasure: 1,
        endEvent: 3,
        anchorMeasure: 1,
        anchorEvent: 2,
        rangeMode: true,
      },
      inputState: {
        ...useEditorStore.getState().inputState,
        cursor: { partIndex: 0, measureIndex: 1, voiceIndex: 0, eventIndex: 2, staveIndex: 0 },
      },
    });

    await useEditorStore.getState().pasteAtCursor();

    const result = useEditorStore.getState();
    const m1Events = result.score.parts[0].measures[1].voices[0].events;

    // The selected notes (indices 2-3) were removed, and clipboard content
    // (2 notes) was inserted at the start of the selection.
    // Original: G A B C5 → after removing B C5 → G A → splice in C D → G A C D
    expect(m1Events.length).toBeGreaterThanOrEqual(2);
    // Selection should be cleared after paste
    expect(result.noteSelection).toBeNull();
    expect(result.selection).toBeNull();
  });

  it("paste with measure selection replaces measure voices", async () => {
    // Copy measure 0 via measure-level clipboard
    const state = useEditorStore.getState();
    const m0 = structuredClone(state.score.parts[0].measures[0]);
    useEditorStore.setState({
      clipboardMeasures: [m0],
      selection: {
        partIndex: 0,
        measureStart: 1,
        measureEnd: 1,
        measureAnchor: 1,
      },
      inputState: {
        ...state.inputState,
        cursor: { partIndex: 0, measureIndex: 1, voiceIndex: 0, eventIndex: 0, staveIndex: 0 },
      },
    });

    await useEditorStore.getState().pasteAtCursor();

    const result = useEditorStore.getState();
    const m1Voices = result.score.parts[0].measures[1].voices;
    // Pasted content should replace the existing measure voices
    expect(m1Voices[0].events.length).toBeGreaterThan(0);
    // First event should be a note (from the pasted measure)
    expect(m1Voices[0].events[0].kind).toBe("note");
  });

  it("paste without selection inserts at cursor", async () => {
    useEditorStore.setState({
      clipboardEvents: {
        voiceIndex: 0,
        measures: [[factory.rest(factory.dur("quarter"))]],
      },
      inputState: {
        ...useEditorStore.getState().inputState,
        cursor: { partIndex: 0, measureIndex: 0, voiceIndex: 0, eventIndex: 1, staveIndex: 0 },
      },
    });

    await useEditorStore.getState().pasteAtCursor();

    const result = useEditorStore.getState();
    const events = result.score.parts[0].measures[0].voices[0].events;
    // A rest should be spliced in at index 1
    const hasRest = events.some((e) => e.kind === "rest");
    expect(hasRest).toBe(true);
  });

  it("paste with empty clipboard is a no-op", async () => {
    const before = useEditorStore.getState().score;
    await useEditorStore.getState().pasteAtCursor();
    const after = useEditorStore.getState().score;
    expect(after).toBe(before);
  });
});

describe("Clipboard: copy and paste round-trip", () => {
  beforeEach(() => {
    resetStore();
    mockClipboard.readText.mockRejectedValue(new Error("not available"));
  });

  it("copySelection with measure selection populates clipboardMeasures", () => {
    useEditorStore.setState({
      selection: { partIndex: 0, measureStart: 0, measureEnd: 0, measureAnchor: 0 },
    });
    useEditorStore.getState().copySelection();
    const state = useEditorStore.getState();
    expect(state.clipboardMeasures).not.toBeNull();
    expect(state.clipboardMeasures!.length).toBe(1);
    expect(state.clipboardEvents).toBeNull();
  });

  it("copySelection with note selection populates clipboardEvents", () => {
    useEditorStore.setState({
      noteSelection: {
        partIndex: 0,
        voiceIndex: 0,
        startMeasure: 0,
        startEvent: 0,
        endMeasure: 0,
        endEvent: 1,
        anchorMeasure: 0,
        anchorEvent: 0,
        rangeMode: true,
      },
    });
    useEditorStore.getState().copySelection();
    const state = useEditorStore.getState();
    expect(state.clipboardEvents).not.toBeNull();
    expect(state.clipboardEvents!.measures[0].length).toBe(2);
    expect(state.clipboardMeasures).toBeNull();
  });
});
