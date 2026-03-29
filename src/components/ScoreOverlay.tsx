import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../state";
import type { CursorPosition } from "../input/InputState";
import type { Selection } from "../plugins/PluginAPI";

// Title layout constants — must match ScoreRenderer.ts
const BASE_TOP_MARGIN = 40;

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
  const showTitle = useEditorStore((s) => s.showTitle);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingComposer, setEditingComposer] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  // Selection anchor
  const anchorRef = useRef<{ partIndex: number; measureIndex: number } | null>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingComposer) composerRef.current?.focus();
  }, [editingComposer]);

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

    // Title click-to-edit
    if (showTitle && y >= titleY - 10 && y <= titleY + titleHeight) {
      const centerX = width / 2;
      if (Math.abs(x - centerX) < 200) {
        setTitleValue(score.title);
        setEditingTitle(true);
        return;
      }
    }

    // Composer click-to-edit
    if (showTitle && y >= composerY && y <= composerY + composerHeight) {
      const centerX = width / 2;
      if (Math.abs(x - centerX) < 150) {
        setComposerValue(score.composer);
        setEditingComposer(true);
        return;
      }
    }

    // Click on a note — move cursor there
    for (const [, nb] of noteBoxes) {
      if (x >= nb.x && x <= nb.x + nb.width && y >= nb.y && y <= nb.y + nb.height) {
        const cursor: CursorPosition = {
          partIndex: nb.partIndex,
          measureIndex: nb.measureIndex,
          voiceIndex: nb.voiceIndex,
          eventIndex: nb.eventIndex,
        };
        setCursorDirect(cursor);

        if (e.shiftKey && anchorRef.current) {
          setSelection({
            partIndex: nb.partIndex,
            measureStart: Math.min(anchorRef.current.measureIndex, nb.measureIndex),
            measureEnd: Math.max(anchorRef.current.measureIndex, nb.measureIndex),
          });
        } else {
          anchorRef.current = { partIndex: nb.partIndex, measureIndex: nb.measureIndex };
          setSelection(null);
        }
        return;
      }
    }

    // Click on measure — move cursor to measure start
    for (const mp of measurePositions) {
      if (x >= mp.x && x <= mp.x + mp.width && y >= mp.y && y <= mp.y + mp.height) {
        setCursorDirect({
          partIndex: mp.partIndex,
          measureIndex: mp.measureIndex,
          voiceIndex: 0,
          eventIndex: 0,
        });

        if (e.shiftKey && anchorRef.current) {
          setSelection({
            partIndex: mp.partIndex,
            measureStart: Math.min(anchorRef.current.measureIndex, mp.measureIndex),
            measureEnd: Math.max(anchorRef.current.measureIndex, mp.measureIndex),
          });
        } else {
          anchorRef.current = { partIndex: mp.partIndex, measureIndex: mp.measureIndex };
          setSelection(null);
        }
        return;
      }
    }
  }, [noteBoxes, measurePositions, score, width, hasTitle, hasComposer, titleY, composerY, setCursorDirect, setSelection, showTitle]);

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
        cursor: "default",
      }}
    >
      {showTitle && editingTitle && (
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

      {showTitle && editingComposer && (
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
