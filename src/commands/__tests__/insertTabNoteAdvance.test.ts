import { describe, it, expect } from "vitest";
import { InsertTabNote } from "../InsertTabNote";
import { factory } from "../../model";
import { STANDARD_TUNING } from "../../model/guitar";
import type { EditorSnapshot } from "../Command";

/**
 * Tests for #261 — InsertTabNote should auto-advance to the next measure
 * when the current measure is full, matching InsertNote's behavior.
 */

function makeScore(measureCount = 1) {
  const measures = [];
  for (let i = 0; i < measureCount; i++) {
    measures.push(factory.measure([factory.voice([])]));
  }
  return factory.score("T", "", [factory.part("Guitar", "Gtr.", measures, "guitar")]);
}

function snapshot(score: ReturnType<typeof makeScore>, eventIndex = 0, measureIndex = 0): EditorSnapshot {
  return {
    score,
    inputState: {
      cursor: { partIndex: 0, measureIndex, voiceIndex: 0, eventIndex, staveIndex: 0 },
      duration: { type: "quarter", dots: 0 },
      accidental: "natural",
      accidentalExplicit: false,
      octave: 4,
      voice: 0,
      noteEntry: true,
      insertMode: false,
      graceNoteMode: false,
      pitchBeforeDuration: false,
      pendingPitch: null,
      tabInputActive: true,
      tabString: 1,
      tabFretBuffer: "",
      textInputMode: null,
      textInputBuffer: "",
      textInputInitialValue: "",
      selectedHeadIndex: null,
    } as EditorSnapshot["inputState"],
  };
}

describe("InsertTabNote auto-advance (#261)", () => {
  it("auto-advances to next measure when current 4/4 measure is full of quarters", () => {
    const score = makeScore(2);
    // Fill measure 0 with 4 quarter-note tab events by calling InsertTabNote 4 times.
    let state = snapshot(score);
    for (let i = 0; i < 4; i++) {
      state = new InsertTabNote(0, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    }
    // After 4 inserts, measure 0 should hold 4 quarters and cursor should still be in measure 0.
    expect(state.score.parts[0].measures[0].voices[0].events).toHaveLength(4);
    expect(state.inputState.cursor.measureIndex).toBe(0);
    expect(state.inputState.cursor.eventIndex).toBe(4);

    // The 5th insert must auto-advance into measure 1 and place the note at position 0.
    state = new InsertTabNote(0, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    expect(state.inputState.cursor.measureIndex).toBe(1);
    expect(state.inputState.cursor.eventIndex).toBe(1);
    expect(state.score.parts[0].measures[1].voices[0].events).toHaveLength(1);
  });

  it("auto-appends a new measure when advancing past the last measure", () => {
    const score = makeScore(1);
    let state = snapshot(score);
    for (let i = 0; i < 4; i++) {
      state = new InsertTabNote(0, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    }
    expect(state.score.parts[0].measures).toHaveLength(1);
    // 5th insert should append measure 1 automatically.
    state = new InsertTabNote(0, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    expect(state.score.parts[0].measures).toHaveLength(2);
    expect(state.inputState.cursor.measureIndex).toBe(1);
    expect(state.score.parts[0].measures[1].voices[0].events).toHaveLength(1);
  });

  it("overwrite behavior is preserved when cursor is on an existing event", () => {
    const score = makeScore(1);
    // Seed the measure with one rest event at index 0
    score.parts[0].measures[0].voices[0].events.push(
      factory.rest(factory.dur("whole")),
    );
    const state = snapshot(score, 0);
    const result = new InsertTabNote(5, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    // Event 0 should now be a tab note (fret 5), not a rest
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("note");
    expect(result.score.parts[0].measures[0].voices[0].events).toHaveLength(1);
  });
});

describe("InsertTabNote chord building (#264)", () => {
  it("turns an existing single note into a chord when a different string is entered", () => {
    const score = makeScore(1);
    // Seed with a tab note on string 1, fret 3
    let state = snapshot(score, 0);
    state = new InsertTabNote(3, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    expect(state.inputState.cursor.eventIndex).toBe(1);

    // Rewind cursor to the just-inserted note (as ArrowUp/Down would do)
    state = { ...state, inputState: { ...state.inputState, cursor: { ...state.inputState.cursor, eventIndex: 0 } } };

    // Enter fret 5 on string 2 — should add to chord, not replace
    state = new InsertTabNote(5, 2, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);

    const evt = state.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("chord");
    if (evt.kind === "chord") {
      expect(evt.heads).toHaveLength(2);
      expect(evt.heads.map((h) => h.tabInfo?.string).sort()).toEqual([1, 2]);
    }
    // Cursor stays on the chord so more heads can be added
    expect(state.inputState.cursor.eventIndex).toBe(0);
  });

  it("appends a head to an existing chord for a new string", () => {
    const score = makeScore(1);
    let state = snapshot(score, 0);
    state = new InsertTabNote(3, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    state = { ...state, inputState: { ...state.inputState, cursor: { ...state.inputState.cursor, eventIndex: 0 } } };
    state = new InsertTabNote(5, 2, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    state = new InsertTabNote(7, 3, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);

    const evt = state.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("chord");
    if (evt.kind === "chord") {
      expect(evt.heads).toHaveLength(3);
      expect(evt.heads.map((h) => h.tabInfo?.string).sort()).toEqual([1, 2, 3]);
      expect(evt.heads.find((h) => h.tabInfo?.string === 3)?.tabInfo?.fret).toBe(7);
    }
  });

  it("replaces the same-string head within a chord (edit, not append)", () => {
    const score = makeScore(1);
    let state = snapshot(score, 0);
    state = new InsertTabNote(3, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    state = { ...state, inputState: { ...state.inputState, cursor: { ...state.inputState.cursor, eventIndex: 0 } } };
    state = new InsertTabNote(5, 2, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    // Now replace the string-2 fret with 7
    state = new InsertTabNote(7, 2, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);

    const evt = state.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("chord");
    if (evt.kind === "chord") {
      expect(evt.heads).toHaveLength(2);
      expect(evt.heads.find((h) => h.tabInfo?.string === 2)?.tabInfo?.fret).toBe(7);
    }
  });

  it("replaces same-string single note in place and advances", () => {
    const score = makeScore(1);
    let state = snapshot(score, 0);
    state = new InsertTabNote(3, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);
    state = { ...state, inputState: { ...state.inputState, cursor: { ...state.inputState.cursor, eventIndex: 0 } } };
    // Same string, different fret — should replace, not chord
    state = new InsertTabNote(7, 1, { type: "quarter", dots: 0 }, STANDARD_TUNING, 0).execute(state);

    const evt = state.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("note");
    if (evt.kind === "note") {
      expect(evt.head.tabInfo?.fret).toBe(7);
    }
    expect(state.inputState.cursor.eventIndex).toBe(1);
  });
});
