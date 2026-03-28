import { useEffect } from "react";
import { useEditorStore } from "../state";
import type { PitchClass, DurationType } from "../model";

const NOTE_KEYS: Record<string, PitchClass> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
};

const DURATION_KEYS: Record<string, DurationType> = {
  "1": "whole",
  "2": "half",
  "3": "quarter",
  "4": "eighth",
  "5": "16th",
  "6": "32nd",
  "7": "64th",
};

export function KeyboardShortcuts() {
  const insertNote = useEditorStore((s) => s.insertNote);
  const insertRest = useEditorStore((s) => s.insertRest);
  const deleteNote = useEditorStore((s) => s.deleteNote);
  const setDuration = useEditorStore((s) => s.setDuration);
  const toggleDot = useEditorStore((s) => s.toggleDot);
  const setAccidental = useEditorStore((s) => s.setAccidental);
  const moveCursor = useEditorStore((s) => s.moveCursor);
  const changeOctave = useEditorStore((s) => s.changeOctave);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Note input
      if (!e.metaKey && !e.ctrlKey && NOTE_KEYS[key]) {
        e.preventDefault();
        insertNote(NOTE_KEYS[key]);
        return;
      }

      // Rest
      if (key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        insertRest();
        return;
      }

      // Duration
      if (DURATION_KEYS[key] && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setDuration(DURATION_KEYS[key]);
        return;
      }

      // Dot
      if (key === "." && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleDot();
        return;
      }

      // Accidentals
      if (key === "=" || key === "+") {
        e.preventDefault();
        setAccidental("sharp");
        return;
      }
      if (key === "-" || key === "_") {
        e.preventDefault();
        setAccidental("flat");
        return;
      }

      // Cursor movement
      if (key === "arrowleft") {
        e.preventDefault();
        moveCursor("left");
        return;
      }
      if (key === "arrowright") {
        e.preventDefault();
        moveCursor("right");
        return;
      }

      // Octave
      if (key === "arrowup") {
        e.preventDefault();
        if (e.shiftKey) {
          changeOctave("up");
        } else {
          changeOctave("up");
        }
        return;
      }
      if (key === "arrowdown") {
        e.preventDefault();
        if (e.shiftKey) {
          changeOctave("down");
        } else {
          changeOctave("down");
        }
        return;
      }

      // Delete
      if (key === "backspace" || key === "delete") {
        e.preventDefault();
        deleteNote();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    insertNote,
    insertRest,
    deleteNote,
    setDuration,
    toggleDot,
    setAccidental,
    moveCursor,
    changeOctave,
    undo,
    redo,
  ]);

  return null;
}
