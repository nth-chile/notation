import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../state";
import type { CursorPosition } from "../input/InputState";
import type { Selection } from "../plugins/PluginAPI";
import type { PitchClass, Octave } from "../model/pitch";

// Title layout constants — must match ScoreRenderer.ts
const BASE_TOP_MARGIN = 40;

// VexFlow staff: top line is ~14px from stave Y, lines are 10px apart
// 5 lines = 4 spaces = 40px. Staff positions go from top (higher pitch) to bottom (lower).
const STAVE_TOP_LINE_OFFSET = 14;
const LINE_SPACING = 10;

// Treble clef: top line = F5, each half-step down = one position
// Positions: 0=F5, 1=E5, 2=D5, 3=C5, 4=B4, 5=A4, 6=G4, 7=F4, 8=E4, 9=D4
// (positions are in steps, not half-steps — diatonic)
const TREBLE_PITCHES: { pitchClass: PitchClass; octave: Octave }[] = [
  { pitchClass: "A", octave: 5 },  // above top line
  { pitchClass: "G", octave: 5 },  // above top line
  { pitchClass: "F", octave: 5 },  // top line
  { pitchClass: "E", octave: 5 },  // 4th space
  { pitchClass: "D", octave: 5 },  // 4th line
  { pitchClass: "C", octave: 5 },  // 3rd space
  { pitchClass: "B", octave: 4 },  // 3rd line (middle)
  { pitchClass: "A", octave: 4 },  // 2nd space
  { pitchClass: "G", octave: 4 },  // 2nd line
  { pitchClass: "F", octave: 4 },  // 1st space
  { pitchClass: "E", octave: 4 },  // bottom line
  { pitchClass: "D", octave: 4 },  // below bottom line
  { pitchClass: "C", octave: 4 },  // below bottom line
];

const BASS_PITCHES: { pitchClass: PitchClass; octave: Octave }[] = [
  { pitchClass: "C", octave: 4 },
  { pitchClass: "B", octave: 3 },
  { pitchClass: "A", octave: 3 },
  { pitchClass: "G", octave: 3 },
  { pitchClass: "F", octave: 3 },
  { pitchClass: "E", octave: 3 },
  { pitchClass: "D", octave: 3 },
  { pitchClass: "C", octave: 3 },
  { pitchClass: "B", octave: 2 },
  { pitchClass: "A", octave: 2 },
  { pitchClass: "G", octave: 2 },
  { pitchClass: "F", octave: 2 },
  { pitchClass: "E", octave: 2 },
];

function yToStaffPosition(y: number, staveY: number): number {
  const relY = y - staveY - STAVE_TOP_LINE_OFFSET;
  return Math.round(relY / (LINE_SPACING / 2));
}

function staffPositionToPitch(pos: number, clef: "treble" | "bass" = "treble"): { pitchClass: PitchClass; octave: Octave } | null {
  const pitches = clef === "bass" ? BASS_PITCHES : TREBLE_PITCHES;
  // Clamp to valid range
  const idx = Math.max(0, Math.min(pitches.length - 1, pos));
  return pitches[idx] ?? null;
}

interface Props {
  width: number;
  height: number;
}

export function ScoreOverlay({ width, height }: Props) {
  const score = useEditorStore((s) => s.score);
  const noteBoxes = useEditorStore((s) => s.noteBoxes);
  const measurePositions = useEditorStore((s) => s.measurePositions);
  const setCursorDirect = useEditorStore((s) => s.setCursorDirect);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setComposer = useEditorStore((s) => s.setComposer);
  const inputMode = useEditorStore((s) => s.inputState.mode);
  const insertNote = useEditorStore((s) => s.insertNote);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingComposer, setEditingComposer] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  // Selection drag state
  const anchorRef = useRef<{ partIndex: number; measureIndex: number } | null>(null);

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingComposer) composerRef.current?.focus();
  }, [editingComposer]);

  // Title region bounds
  const hasTitle = !!score.title;
  const hasComposer = !!score.composer;
  const titleY = BASE_TOP_MARGIN - 10;
  const titleHeight = 38;
  const composerY = titleY + (hasTitle ? titleHeight : 0);
  const composerHeight = 22;

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;

    // Check title region
    if ((hasTitle || !score.title) && y >= titleY - 10 && y <= titleY + titleHeight) {
      const centerX = width / 2;
      if (Math.abs(x - centerX) < 200) {
        setTitleValue(score.title);
        setEditingTitle(true);
        return;
      }
    }

    // Check composer region
    if ((hasComposer || !score.composer) && y >= composerY && y <= composerY + composerHeight) {
      const centerX = width / 2;
      if (Math.abs(x - centerX) < 150) {
        setComposerValue(score.composer);
        setEditingComposer(true);
        return;
      }
    }

    // Check noteBoxes (point-in-rect)
    for (const [, nb] of noteBoxes) {
      if (x >= nb.x && x <= nb.x + nb.width && y >= nb.y && y <= nb.y + nb.height) {
        const cursor: CursorPosition = {
          partIndex: nb.partIndex,
          measureIndex: nb.measureIndex,
          voiceIndex: nb.voiceIndex,
          eventIndex: nb.eventIndex,
        };
        setCursorDirect(cursor);

        // Shift+click extends selection
        if (e.shiftKey && anchorRef.current) {
          const sel: Selection = {
            partIndex: nb.partIndex,
            measureStart: Math.min(anchorRef.current.measureIndex, nb.measureIndex),
            measureEnd: Math.max(anchorRef.current.measureIndex, nb.measureIndex),
          };
          setSelection(sel);
        } else {
          anchorRef.current = { partIndex: nb.partIndex, measureIndex: nb.measureIndex };
          setSelection(null);
        }
        return;
      }
    }

    // Check measurePositions (click on staff)
    for (const mp of measurePositions) {
      if (x >= mp.x && x <= mp.x + mp.width && y >= mp.y && y <= mp.y + mp.height) {
        // Selection mode: move cursor or extend selection
        if (inputMode === "select" || e.shiftKey) {
          const cursor: CursorPosition = {
            partIndex: mp.partIndex,
            measureIndex: mp.measureIndex,
            voiceIndex: 0,
            eventIndex: 0,
          };
          setCursorDirect(cursor);

          if (e.shiftKey && anchorRef.current) {
            const sel: Selection = {
              partIndex: mp.partIndex,
              measureStart: Math.min(anchorRef.current.measureIndex, mp.measureIndex),
              measureEnd: Math.max(anchorRef.current.measureIndex, mp.measureIndex),
            };
            setSelection(sel);
          } else {
            anchorRef.current = { partIndex: mp.partIndex, measureIndex: mp.measureIndex };
            setSelection(null);
          }
          return;
        }

        // Note entry mode: insert note at clicked pitch
        const measure = score.parts[mp.partIndex]?.measures[mp.measureIndex];
        const clef = measure?.clef.type === "bass" ? "bass" : "treble";
        const staffPos = yToStaffPosition(y, mp.y);
        const pitch = staffPositionToPitch(staffPos, clef as "treble" | "bass");

        if (pitch) {
          // Move cursor to end of this measure's voice 0
          const voice = measure?.voices[0];
          const eventIndex = voice?.events.length ?? 0;
          setCursorDirect({
            partIndex: mp.partIndex,
            measureIndex: mp.measureIndex,
            voiceIndex: 0,
            eventIndex,
          });

          // Set octave to match clicked pitch, then insert
          useEditorStore.setState((s) => ({
            inputState: { ...s.inputState, octave: pitch.octave },
          }));
          insertNote(pitch.pitchClass);
        }
        return;
      }
    }
  }, [noteBoxes, measurePositions, score, width, hasTitle, hasComposer, titleY, composerY, setCursorDirect, setSelection, setTitle, setComposer]);

  const commitTitle = useCallback(() => {
    setTitle(titleValue);
    setEditingTitle(false);
  }, [titleValue, setTitle]);

  const commitComposer = useCallback(() => {
    setComposer(composerValue);
    setEditingComposer(false);
  }, [composerValue, setComposer]);

  return (
    <div
      onClick={handleClick}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        cursor: inputMode === "select" ? "default" : "crosshair",
      }}
    >
      {/* Title inline edit */}
      {editingTitle && (
        <input
          ref={titleRef}
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          style={{
            position: "absolute",
            top: titleY - 14,
            left: width / 2 - 200,
            width: 400,
            textAlign: "center",
            font: "bold 32px 'Times New Roman', 'Georgia', serif",
            color: "#fff",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 4,
            outline: "none",
            padding: "2px 8px",
          }}
        />
      )}

      {/* Composer inline edit */}
      {editingComposer && (
        <input
          ref={composerRef}
          value={composerValue}
          onChange={(e) => setComposerValue(e.target.value)}
          onBlur={commitComposer}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitComposer();
            if (e.key === "Escape") setEditingComposer(false);
          }}
          style={{
            position: "absolute",
            top: composerY - 6,
            left: width / 2 - 150,
            width: 300,
            textAlign: "center",
            font: "italic 15px 'Times New Roman', 'Georgia', serif",
            color: "#fff",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 4,
            outline: "none",
            padding: "2px 8px",
          }}
        />
      )}
    </div>
  );
}
