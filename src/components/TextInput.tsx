import { useRef, useEffect } from "react";
import { useEditorStore } from "../state";

export function TextInput() {
  const textInputMode = useEditorStore((s) => s.inputState.textInputMode);
  const commitTextInput = useEditorStore((s) => s.commitTextInput);
  const cancelTextInput = useEditorStore((s) => s.cancelTextInput);
  const cursor = useEditorStore((s) => s.inputState.cursor);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInputMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = "";
    }
  }, [textInputMode, cursor.measureIndex, cursor.eventIndex]);

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
      // Tab advances to next note in lyric mode
      e.preventDefault();
      commitTextInput(inputRef.current?.value ?? "");
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <span style={styles.label}>{label}</span>
        <input
          ref={inputRef}
          type="text"
          style={styles.input}
          placeholder={textInputMode === "chord" ? "e.g. Cmaj7" : "e.g. hel-"}
          onKeyDown={handleKeyDown}
          onBlur={() => cancelTextInput()}
        />
        <span style={styles.hint}>
          Enter to confirm{textInputMode === "lyric" ? ", Tab to advance" : ""}, Esc to cancel
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    bottom: 40,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
  },
  container: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "2px solid #2563eb",
    borderRadius: 6,
    padding: "6px 12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  label: {
    fontWeight: 600,
    fontSize: 13,
    color: "#2563eb",
  },
  input: {
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 14,
    minWidth: 150,
    outline: "none",
  },
  hint: {
    fontSize: 11,
    color: "#888",
  },
};
