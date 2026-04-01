import { useEditorStore } from "../state";
import { useHotkey } from "../hooks/useHotkey";
import { showHistoryModal } from "./HistoryModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export function StatusBar() {
  const filePath = useEditorStore((s) => s.filePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const hotkey = useHotkey();

  const fileName = filePath ? filePath.split("/").pop() : "Untitled";

  return (
    <div className="flex items-center gap-4 px-4 py-1 border-t bg-background text-muted-foreground text-xs shrink-0">
      <span className="whitespace-nowrap">{fileName}{isDirty ? " — Unsaved" : ""}</span>
      <span className="ml-auto" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={showHistoryModal}
            className="hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <polyline points="8,4.5 8,8 11,10" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{`File history (${hotkey("file-history")})`}</TooltipContent>
      </Tooltip>
    </div>
  );
}
