import { useEffect, useState } from "react";
import { useEditorStore } from "../state";
import { useHotkey } from "../hooks/useHotkey";
import { showHistoryModal } from "./HistoryModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import * as jack from "../playback/jackTransport";

export function StatusBar() {
  const filePath = useEditorStore((s) => s.filePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const hotkey = useHotkey();
  const [jackConnected, setJackConnected] = useState(jack.isJackConnected());

  useEffect(() => jack.subscribe(setJackConnected), []);

  const fileName = filePath ? filePath.split("/").pop() : "Untitled";

  return (
    <div className="flex items-center gap-4 px-4 py-1 border-t bg-background text-muted-foreground text-xs shrink-0">
      <span className="whitespace-nowrap">{fileName}{isDirty ? " — Unsaved" : ""}</span>
      <span className="ml-auto" />
      {jackConnected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => jack.disconnect().catch(() => {})}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            >
              JACK
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">JACK transport connected — click to disconnect</TooltipContent>
        </Tooltip>
      )}
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
