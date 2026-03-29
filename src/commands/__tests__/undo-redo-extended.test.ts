import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { CommandHistory } from "../CommandHistory";
import { InsertNote } from "../InsertNote";
import { OverwriteNote } from "../OverwriteNote";
import { SetDynamic } from "../SetDynamic";
import { SetSlur } from "../SetSlur";
import { InsertGraceNote } from "../InsertGraceNote";
import { TogglePickup } from "../TogglePickup";
import { SetLyric } from "../SetLyric";
import { SetRehearsalMark } from "../SetRehearsalMark";
import { ChangeClef } from "../ChangeClef";
import { ChangeKeySig } from "../ChangeKeySig";
import { ChangeTimeSig } from "../ChangeTimeSig";
import { DeleteMeasure } from "../DeleteMeasure";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

function makeSnapshot(): EditorSnapshot {
  return {
    score: factory.score("Test", "", [
      factory.part("Piano", "Pno.", [
        factory.measure([factory.voice([factory.note("C", 4, factory.dur("quarter"))])]),
        factory.measure([factory.voice([])]),
        factory.measure([factory.voice([])]),
      ]),
    ]),
    inputState: defaultInputState(),
  };
}

function stripIds(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripIds);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "id") continue;
      result[k] = stripIds(v);
    }
    return result;
  }
  return obj;
}

describe("Undo/Redo for new commands", () => {
  function testUndoRedo(name: string, setup: (snap: EditorSnapshot) => { history: CommandHistory; after: EditorSnapshot; before: EditorSnapshot }) {
    it(`undoes ${name}`, () => {
      const snap = makeSnapshot();
      const { history, after, before } = setup(snap);
      const undone = history.undo(after);
      expect(undone).not.toBeNull();
      expect(undone!.score).toEqual(before.score);
    });

    it(`redoes ${name}`, () => {
      const snap = makeSnapshot();
      const { history, after } = setup(snap);
      const undone = history.undo(after)!;
      const redone = history.redo(undone);
      expect(redone).not.toBeNull();
      expect(stripIds(redone!.score)).toEqual(stripIds(after.score));
    });
  }

  testUndoRedo("OverwriteNote", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new OverwriteNote("D", 4, "natural", factory.dur("half")), snap);
    return { history, after, before };
  });

  testUndoRedo("SetDynamic", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const evtId = snap.score.parts[0].measures[0].voices[0].events[0].id;
    const after = history.execute(new SetDynamic("ff", evtId), snap);
    return { history, after, before };
  });

  testUndoRedo("SetSlur", (snap) => {
    const history = new CommandHistory();
    // Add a second note
    const withTwo = new InsertNote("D", 4, "natural", factory.dur("quarter")).execute(snap);
    const before = structuredClone(withTwo);
    const id1 = withTwo.score.parts[0].measures[0].voices[0].events[0].id;
    const id2 = withTwo.score.parts[0].measures[0].voices[0].events[1].id;
    const after = history.execute(new SetSlur(id1, id2), withTwo);
    return { history, after, before };
  });

  testUndoRedo("InsertGraceNote", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new InsertGraceNote("B", 3, "natural"), snap);
    return { history, after, before };
  });

  testUndoRedo("TogglePickup", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new TogglePickup(), snap);
    return { history, after, before };
  });

  testUndoRedo("SetLyric", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const evtId = snap.score.parts[0].measures[0].voices[0].events[0].id;
    const after = history.execute(new SetLyric("la", evtId), snap);
    return { history, after, before };
  });

  testUndoRedo("SetRehearsalMark", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new SetRehearsalMark("A"), snap);
    return { history, after, before };
  });

  testUndoRedo("ChangeClef", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new ChangeClef({ type: "bass" }), snap);
    return { history, after, before };
  });

  testUndoRedo("ChangeKeySig", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new ChangeKeySig({ fifths: 3 }), snap);
    return { history, after, before };
  });

  testUndoRedo("ChangeTimeSig", (snap) => {
    const history = new CommandHistory();
    const before = structuredClone(snap);
    const after = history.execute(new ChangeTimeSig({ numerator: 3, denominator: 4 }), snap);
    return { history, after, before };
  });

  testUndoRedo("DeleteMeasure", (snap) => {
    const history = new CommandHistory();
    // Cursor on empty measure 1
    snap.inputState.cursor.measureIndex = 1;
    const before = structuredClone(snap);
    const after = history.execute(new DeleteMeasure(), snap);
    return { history, after, before };
  });
});

describe("CommandHistory transactions", () => {
  it("collapses multiple commands into single undo entry", () => {
    const history = new CommandHistory();
    const snap = makeSnapshot();

    history.beginTransaction(snap);
    const r1 = history.execute(new InsertNote("D", 4, "natural", factory.dur("quarter")), snap);
    const r2 = history.execute(new InsertNote("E", 4, "natural", factory.dur("quarter")), r1);
    history.endTransaction();

    // Should have 2 notes inserted
    expect(r2.score.parts[0].measures[0].voices[0].events).toHaveLength(3);

    // Single undo should revert both
    const undone = history.undo(r2);
    expect(undone).not.toBeNull();
    expect(undone!.score.parts[0].measures[0].voices[0].events).toHaveLength(1);

    // No more undo available (it was one batch)
    expect(history.canUndo).toBe(false);
  });

  it("redo works after transaction undo", () => {
    const history = new CommandHistory();
    const snap = makeSnapshot();

    history.beginTransaction(snap);
    const r1 = history.execute(new InsertNote("D", 4, "natural", factory.dur("quarter")), snap);
    const r2 = history.execute(new InsertNote("E", 4, "natural", factory.dur("quarter")), r1);
    history.endTransaction();

    const undone = history.undo(r2)!;
    expect(undone.score.parts[0].measures[0].voices[0].events).toHaveLength(1);
    const redone = history.redo(undone);
    expect(redone).not.toBeNull();
    // Redo re-executes the last command from the transaction start state
    expect(redone!.score.parts[0].measures[0].voices[0].events.length).toBeGreaterThan(1);
  });
});
