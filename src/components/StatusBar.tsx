import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { useEditorStore } from "../state";
import { useHotkey } from "../hooks/useHotkey";
import { showHistoryModal } from "./HistoryModal";
import { openSettings } from "./SettingsPanel";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { openExternal } from "../utils/openExternal";
import * as jack from "../playback/jackTransport";

export const NUBIUM_REPO_URL = "https://github.com/nth-chile/nubium";

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
      <span aria-hidden="true" className="h-3 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Send feedback"
            onClick={() => openSettings("feedback")}
            className="hover:text-foreground transition-colors"
          >
            <Bug size={12} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Send feedback or report a bug</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="View source on GitHub"
            onClick={() => openExternal(NUBIUM_REPO_URL)}
            className="hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">View source on GitHub</TooltipContent>
      </Tooltip>
    </div>
  );
}
