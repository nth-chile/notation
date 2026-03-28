import { create } from "zustand";
import type { Score, DurationType, Accidental, PitchClass, Octave, NoteEventId } from "../model";
import { DURATION_TYPES_ORDERED } from "../model";
import { factory } from "../model";
import { defaultInputState, type InputState, type CursorPosition } from "../input/InputState";
import { CommandHistory } from "../commands/CommandHistory";
import { InsertNote } from "../commands/InsertNote";
import { InsertRest } from "../commands/InsertRest";
import { DeleteNote } from "../commands/DeleteNote";
import type { NoteBox } from "../renderer/vexBridge";

const history = new CommandHistory();

interface EditorStore {
  // Document
  score: Score;
  filePath: string | null;
  isDirty: boolean;

  // Input
  inputState: InputState;

  // Rendering
  noteBoxes: Map<NoteEventId, NoteBox>;

  // Actions
  insertNote(pitchClass: PitchClass): void;
  insertRest(): void;
  deleteNote(): void;
  setDuration(type: DurationType): void;
  toggleDot(): void;
  setAccidental(acc: Accidental): void;
  moveCursor(direction: "left" | "right"): void;
  moveCursorToMeasure(direction: "next" | "prev"): void;
  changeOctave(direction: "up" | "down"): void;
  setScore(score: Score): void;
  setFilePath(path: string | null): void;
  setNoteBoxes(boxes: Map<NoteEventId, NoteBox>): void;
  undo(): void;
  redo(): void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  score: factory.emptyScore(),
  filePath: null,
  isDirty: false,
  inputState: defaultInputState(),
  noteBoxes: new Map(),

  insertNote(pitchClass: PitchClass) {
    const state = get();
    const cmd = new InsertNote(
      pitchClass,
      state.inputState.octave as Octave,
      state.inputState.accidental,
      { ...state.inputState.duration }
    );
    const result = history.execute(cmd, {
      score: state.score,
      inputState: state.inputState,
    });
    set({
      score: result.score,
      inputState: result.inputState,
      isDirty: true,
    });
  },

  insertRest() {
    const state = get();
    const cmd = new InsertRest({ ...state.inputState.duration });
    const result = history.execute(cmd, {
      score: state.score,
      inputState: state.inputState,
    });
    set({
      score: result.score,
      inputState: result.inputState,
      isDirty: true,
    });
  },

  deleteNote() {
    const state = get();
    const cmd = new DeleteNote();
    const result = history.execute(cmd, {
      score: state.score,
      inputState: state.inputState,
    });
    set({
      score: result.score,
      inputState: result.inputState,
      isDirty: true,
    });
  },

  setDuration(type: DurationType) {
    set((s) => ({
      inputState: {
        ...s.inputState,
        duration: { type, dots: 0 },
      },
    }));
  },

  toggleDot() {
    set((s) => ({
      inputState: {
        ...s.inputState,
        duration: {
          ...s.inputState.duration,
          dots: ((s.inputState.duration.dots + 1) % 4) as 0 | 1 | 2 | 3,
        },
      },
    }));
  },

  setAccidental(acc: Accidental) {
    set((s) => ({
      inputState: {
        ...s.inputState,
        accidental: s.inputState.accidental === acc ? "natural" : acc,
      },
    }));
  },

  moveCursor(direction: "left" | "right") {
    set((s) => {
      const cursor = { ...s.inputState.cursor };
      const voice =
        s.score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
      if (!voice) return s;

      if (direction === "right") {
        if (cursor.eventIndex < voice.events.length) {
          cursor.eventIndex++;
        } else {
          // Move to next measure
          const part = s.score.parts[cursor.partIndex];
          if (part && cursor.measureIndex < part.measures.length - 1) {
            cursor.measureIndex++;
            cursor.eventIndex = 0;
          }
        }
      } else {
        if (cursor.eventIndex > 0) {
          cursor.eventIndex--;
        } else if (cursor.measureIndex > 0) {
          cursor.measureIndex--;
          const prevVoice =
            s.score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
          cursor.eventIndex = prevVoice?.events.length ?? 0;
        }
      }

      return { inputState: { ...s.inputState, cursor } };
    });
  },

  moveCursorToMeasure(direction: "next" | "prev") {
    set((s) => {
      const cursor = { ...s.inputState.cursor };
      const part = s.score.parts[cursor.partIndex];
      if (!part) return s;

      if (direction === "next" && cursor.measureIndex < part.measures.length - 1) {
        cursor.measureIndex++;
        cursor.eventIndex = 0;
      } else if (direction === "prev" && cursor.measureIndex > 0) {
        cursor.measureIndex--;
        cursor.eventIndex = 0;
      }

      return { inputState: { ...s.inputState, cursor } };
    });
  },

  changeOctave(direction: "up" | "down") {
    set((s) => ({
      inputState: {
        ...s.inputState,
        octave: Math.max(0, Math.min(9, s.inputState.octave + (direction === "up" ? 1 : -1))) as Octave,
      },
    }));
  },

  setScore(score: Score) {
    set({ score, isDirty: false });
  },

  setFilePath(path: string | null) {
    set({ filePath: path });
  },

  setNoteBoxes(boxes: Map<NoteEventId, NoteBox>) {
    set({ noteBoxes: boxes });
  },

  undo() {
    const state = get();
    const result = history.undo({
      score: state.score,
      inputState: state.inputState,
    });
    if (result) {
      set({ score: result.score, inputState: result.inputState });
    }
  },

  redo() {
    const state = get();
    const result = history.redo({
      score: state.score,
      inputState: state.inputState,
    });
    if (result) {
      set({ score: result.score, inputState: result.inputState });
    }
  },
}));
