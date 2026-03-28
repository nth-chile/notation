import { ScoreCanvas } from "./components/ScoreCanvas";
import { Toolbar } from "./components/Toolbar";
import { StatusBar } from "./components/StatusBar";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { useEditorStore } from "./state";
import { saveScore } from "./fileio/save";
import { loadScore } from "./fileio/load";
import { useEffect, useCallback } from "react";

export function App() {
  const score = useEditorStore((s) => s.score);
  const filePath = useEditorStore((s) => s.filePath);
  const setScore = useEditorStore((s) => s.setScore);
  const setFilePath = useEditorStore((s) => s.setFilePath);

  const handleSave = useCallback(async () => {
    try {
      const path = await saveScore(score, filePath ?? undefined);
      setFilePath(path);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [score, filePath, setFilePath]);

  const handleOpen = useCallback(async () => {
    try {
      const result = await loadScore();
      if (result) {
        setScore(result.score);
        setFilePath(result.path);
      }
    } catch (err) {
      console.error("Load failed:", err);
    }
  }, [setScore, setFilePath]);

  // Ctrl+S / Ctrl+O
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleOpen]);

  return (
    <div style={styles.app}>
      <KeyboardShortcuts />
      <Toolbar />
      <ScoreCanvas />
      <StatusBar />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};
