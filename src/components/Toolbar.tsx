import { useEditorStore } from "../state";
import { useLayoutStore } from "../state/LayoutState";
import { TooltipButton } from "./ui/tooltip-button";
import { Separator } from "./ui/separator";
import { PanelLeft, PanelRight, Undo2, Redo2, Settings, Puzzle } from "lucide-react";

interface ToolbarProps {
  onToggleSettings?: () => void;
  onTogglePlugins?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
}

export function Toolbar({ onToggleSettings, onTogglePlugins, onOpen, onSave }: ToolbarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const panels = useLayoutStore((s) => s.panels);
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const hasLeftPanels = panels.left.length > 0;
  const hasRightPanels = panels.right.length > 0;

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b bg-card shrink-0">
      {hasLeftPanels && (
        <TooltipButton
          variant={sidebarOpen.left ? "secondary" : "ghost"}
          size="icon"
          onClick={() => toggleSidebar("left")}
          tooltip={sidebarOpen.left ? "Hide left sidebar" : "Show left sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </TooltipButton>
      )}

      <div className="flex items-center gap-1">
        <TooltipButton variant="ghost" size="icon" onClick={undo} tooltip="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </TooltipButton>
        <TooltipButton variant="ghost" size="icon" onClick={redo} tooltip="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </TooltipButton>
      </div>

      <Separator orientation="vertical" />

      <div className="flex items-center gap-1">
        {onOpen && (
          <TooltipButton variant="ghost" size="sm" onClick={onOpen} tooltip="Open file (Ctrl+O)">
            Open
          </TooltipButton>
        )}
        {onSave && (
          <TooltipButton variant="ghost" size="sm" onClick={onSave} tooltip="Save file (Ctrl+S)">
            Save
          </TooltipButton>
        )}
      </div>

      <div className="flex-1" />

      {onTogglePlugins && (
        <TooltipButton variant="ghost" size="icon" onClick={onTogglePlugins} tooltip="Plugins">
          <Puzzle className="h-4 w-4" />
        </TooltipButton>
      )}

      {onToggleSettings && (
        <TooltipButton variant="ghost" size="icon" onClick={onToggleSettings} tooltip="Settings">
          <Settings className="h-4 w-4" />
        </TooltipButton>
      )}

      {hasRightPanels && (
        <TooltipButton
          variant={sidebarOpen.right ? "secondary" : "ghost"}
          size="icon"
          onClick={() => toggleSidebar("right")}
          tooltip={sidebarOpen.right ? "Hide right sidebar" : "Show right sidebar"}
        >
          <PanelRight className="h-4 w-4" />
        </TooltipButton>
      )}
    </div>
  );
}
