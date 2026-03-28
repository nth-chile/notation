import { useEditorStore } from "../state";
import type { ViewModeType } from "../views/ViewMode";

const VIEW_MODES: { type: ViewModeType; label: string; shortcut: string }[] = [
  { type: "songwriter", label: "Songwriter", shortcut: "1" },
  { type: "lead-sheet", label: "Lead Sheet", shortcut: "2" },
  { type: "tab", label: "Tab", shortcut: "3" },
  { type: "full-score", label: "Full Score", shortcut: "4" },
];

export function ViewSwitcher() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  return (
    <div style={styles.container}>
      {VIEW_MODES.map(({ type, label, shortcut }) => (
        <button
          key={type}
          onClick={() => setViewMode(type)}
          style={{
            ...styles.button,
            ...(viewMode === type ? styles.activeButton : {}),
          }}
          title={`${label} (Ctrl+Shift+${shortcut})`}
        >
          <span style={styles.icon}>{getIcon(type)}</span>
          <span style={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function getIcon(type: ViewModeType): string {
  switch (type) {
    case "songwriter":
      return "\u266B"; // musical note
    case "lead-sheet":
      return "\u266A"; // eighth note
    case "tab":
      return "TAB";
    case "full-score":
      return "\u{1D11E}"; // musical symbol G clef
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: "2px",
    padding: "4px 12px",
    background: "#f0f0f0",
    borderBottom: "1px solid #ddd",
    alignItems: "center",
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    border: "1px solid transparent",
    borderRadius: "4px",
    background: "transparent",
    cursor: "pointer",
    fontSize: "12px",
    color: "#555",
    transition: "all 0.15s",
  },
  activeButton: {
    background: "#fff",
    border: "1px solid #ccc",
    color: "#000",
    fontWeight: "bold" as const,
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  },
  icon: {
    fontSize: "14px",
  },
  label: {
    fontSize: "12px",
  },
};
