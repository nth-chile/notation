import { useEditorStore } from "../state";
import { showHistoryModal } from "./HistoryModal";

export function StatusBar() {
  const filePath = useEditorStore((s) => s.filePath);
  const autoSaveStatus = useEditorStore((s) => s.autoSaveStatus);

  return (
    <div className="flex items-center gap-4 px-4 py-1 border-t bg-background text-muted-foreground text-xs shrink-0">
      <span className="whitespace-nowrap">{filePath ? filePath.split("/").pop() : "Untitled"}</span>
      <span className="ml-auto" />
      {autoSaveStatus && <span className="whitespace-nowrap">{autoSaveStatus}</span>}
      <button
        onClick={showHistoryModal}
        className="hover:text-foreground transition-colors"
        title="File History"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5" />
          <polyline points="8,4.5 8,8 11,10" />
        </svg>
      </button>
    </div>
  );
}
