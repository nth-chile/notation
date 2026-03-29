import { useEffect } from "react";
import { useEditorStore } from "../state";
import type { PitchClass, DurationType } from "../model";
import type { ViewModeType } from "../views/ViewMode";

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
  const setVoice = useEditorStore((s) => s.setVoice);
  const insertMeasure = useEditorStore((s) => s.insertMeasure);
  const deleteMeasure = useEditorStore((s) => s.deleteMeasure);
  const enterChordMode = useEditorStore((s) => s.enterChordMode);
  const enterLyricMode = useEditorStore((s) => s.enterLyricMode);
  const showLyrics = useEditorStore((s) => s.showLyrics);
  const textInputMode = useEditorStore((s) => s.inputState.textInputMode);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const play = useEditorStore((s) => s.play);
  const pause = useEditorStore((s) => s.pause);
  const stopPlayback = useEditorStore((s) => s.stopPlayback);
  const moveCursorPart = useEditorStore((s) => s.moveCursorPart);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const toggleArticulation = useEditorStore((s) => s.toggleArticulation);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const extendSelection = useEditorStore((s) => s.extendSelection);
  const deleteSelectedMeasures = useEditorStore((s) => s.deleteSelectedMeasures);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteAtCursor = useEditorStore((s) => s.pasteAtCursor);
  const clipboardMeasures = useEditorStore((s) => s.clipboardMeasures);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Don't capture when in text input mode
      if (textInputMode) return;

      const key = e.key.toLowerCase();

      // Escape: clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        setSelection(null);
        return;
      }

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

      // Copy selection: Ctrl/Cmd+C
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === "c") {
        if (selection) {
          e.preventDefault();
          copySelection();
          return;
        }
        // If no selection, let the browser handle native copy
        return;
      }

      // Paste clipboard measures: Ctrl/Cmd+V
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === "v") {
        if (clipboardMeasures) {
          e.preventDefault();
          pasteAtCursor();
          return;
        }
        return;
      }

      // Cut selection: Ctrl/Cmd+X
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === "x") {
        if (selection) {
          e.preventDefault();
          copySelection();
          deleteSelectedMeasures();
          return;
        }
        return;
      }

      // View mode switching: Ctrl+Shift+1/2/3/4
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key >= "1" && key <= "4") {
        e.preventDefault();
        const viewModes: ViewModeType[] = ["songwriter", "lead-sheet", "tab", "full-score"];
        const idx = parseInt(key) - 1;
        if (idx >= 0 && idx < viewModes.length) {
          setViewMode(viewModes[idx]);
        }
        return;
      }

      // Voice switching: Ctrl+1 through Ctrl+4
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key >= "1" && key <= "4") {
        e.preventDefault();
        setVoice(parseInt(key) - 1);
        return;
      }

      // Insert measure: Ctrl+M
      if ((e.ctrlKey || e.metaKey) && key === "m") {
        e.preventDefault();
        insertMeasure();
        return;
      }

      // Delete measure: Ctrl+Shift+Backspace
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "backspace") {
        e.preventDefault();
        deleteMeasure();
        return;
      }

      // Space: play/pause toggle
      if (key === " " && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
        return;
      }

      // Shift+C: enter chord input mode
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && key === "c") {
        e.preventDefault();
        enterChordMode();
        return;
      }

      // Shift+L: enter lyric input mode (only when lyrics plugin is active)
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && key === "l") {
        if (!showLyrics) return;
        e.preventDefault();
        enterLyricMode();
        return;
      }

      // Articulations: Shift+period=staccato, Shift+comma=accent, Shift+minus=tenuto, Shift+u=fermata
      if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === ">") { e.preventDefault(); toggleArticulation("accent"); return; }
        if (e.key === "<") { e.preventDefault(); toggleArticulation("staccato"); return; }
        if (key === "t") { e.preventDefault(); toggleArticulation("tenuto"); return; }
        if (key === "u") { e.preventDefault(); toggleArticulation("fermata"); return; }
        if (e.key === "^") { e.preventDefault(); toggleArticulation("marcato"); return; }
      }

      // Note input (also handles ChangePitch when cursor is on existing note)
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

      // Shift+arrow: extend selection by measure
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && key === "arrowleft") {
        e.preventDefault();
        extendSelection("left");
        return;
      }
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && key === "arrowright") {
        e.preventDefault();
        extendSelection("right");
        return;
      }

      // Delete/Backspace with selection: delete selected measures
      if (selection && (key === "delete" || key === "backspace") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        deleteSelectedMeasures();
        return;
      }

      // Cursor movement (clears selection)
      if (key === "arrowleft") {
        e.preventDefault();
        if (selection) setSelection(null);
        moveCursor("left");
        return;
      }
      if (key === "arrowright") {
        e.preventDefault();
        if (selection) setSelection(null);
        moveCursor("right");
        return;
      }

      // Alt+Up/Down: move cursor between parts
      if (e.altKey && !e.metaKey && !e.ctrlKey && key === "arrowup") {
        e.preventDefault();
        moveCursorPart("up");
        return;
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey && key === "arrowdown") {
        e.preventDefault();
        moveCursorPart("down");
        return;
      }

      // Octave
      if (key === "arrowup") {
        e.preventDefault();
        changeOctave("up");
        return;
      }
      if (key === "arrowdown") {
        e.preventDefault();
        changeOctave("down");
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
    setVoice,
    insertMeasure,
    deleteMeasure,
    enterChordMode,
    enterLyricMode,
    showLyrics,
    textInputMode,
    isPlaying,
    play,
    pause,
    stopPlayback,
    moveCursorPart,
    setViewMode,
    selection,
    copySelection,
    pasteAtCursor,
    clipboardMeasures,
    deleteSelectedMeasures,
    toggleArticulation,
    setSelection,
    extendSelection,
  ]);

  return null;
}
