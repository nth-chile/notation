import { useRef, useEffect, useMemo } from "react";
import { useEditorStore } from "../state";
import { Input } from "./ui/input";

export function TextInput() {
  const textInputMode = useEditorStore((s) => s.inputState.textInputMode);
  const commitTextInput = useEditorStore((s) => s.commitTextInput);
  const cancelTextInput = useEditorStore((s) => s.cancelTextInput);
  const cursor = useEditorStore((s) => s.inputState.cursor);
  const noteBoxes = useEditorStore((s) => s.noteBoxes);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInputMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = "";
    }
  }, [textInputMode, cursor.measureIndex, cursor.eventIndex]);

  // Find the position of the current note for lyric mode positioning
  const notePosition = useMemo(() => {
    if (textInputMode !== "lyric") return null;

    // Look up the note box matching the current cursor position
    for (const box of noteBoxes.values()) {
      if (
        box.partIndex === cursor.partIndex &&
        box.measureIndex === cursor.measureIndex &&
        box.voiceIndex === cursor.voiceIndex &&
        box.eventIndex === cursor.eventIndex
      ) {
        return { x: box.x + box.width / 2, y: box.y + box.height };
      }
    }
    return null;
  }, [textInputMode, noteBoxes, cursor.partIndex, cursor.measureIndex, cursor.voiceIndex, cursor.eventIndex]);

  if (!textInputMode) return null;

  const label = textInputMode === "chord" ? "Chord:" : "Lyric:";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTextInput(inputRef.current?.value ?? "");
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelTextInput();
    } else if (e.key === "Tab" && textInputMode === "lyric") {
      e.preventDefault();
      commitTextInput(inputRef.current?.value ?? "");
    } else if (e.key === " " && textInputMode === "lyric") {
      e.preventDefault();
      commitTextInput(inputRef.current?.value ?? "");
    }
  }

  // Position near the note in lyric mode, otherwise at the bottom center
  const useNotePosition = textInputMode === "lyric" && notePosition;

  // Get the score container's bounding rect for offset calculation
  const scoreContainer = document.querySelector("[data-score-container]");
  const containerRect = scoreContainer?.getBoundingClientRect();

  const positionStyle = useNotePosition && containerRect
    ? {
        position: "fixed" as const,
        left: `${containerRect.left + notePosition.x}px`,
        top: `${containerRect.top + notePosition.y + 8}px`,
        transform: "translateX(-50%)",
        zIndex: 1000,
      }
    : {
        position: "fixed" as const,
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      };

  return (
    <div style={positionStyle}>
      <div className="flex items-center gap-2 bg-popover border-2 border-primary rounded-md px-3 py-1.5 shadow-lg">
        <span className="font-semibold text-sm text-primary">{label}</span>
        <Input
          ref={inputRef}
          type="text"
          className="min-w-[150px] h-7"
          placeholder={textInputMode === "chord" ? "e.g. Cmaj7" : "e.g. hel-"}
          onKeyDown={handleKeyDown}
          onBlur={() => cancelTextInput()}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {textInputMode === "lyric"
            ? "Enter/Space/Tab to advance, Esc to exit"
            : "Enter to confirm, Esc to cancel"}
        </span>
      </div>
    </div>
  );
}
