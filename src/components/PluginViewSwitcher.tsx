import { useEditorStore } from "../state";
import { Button } from "./ui/button";
import type { ViewEntry } from "../plugins";
import type { ViewModeType } from "../views/ViewMode";

interface PluginViewSwitcherProps {
  views: ViewEntry[];
}

export function PluginViewSwitcher({ views }: PluginViewSwitcherProps) {
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  return (
    <div className="flex gap-0.5 px-3 py-1 bg-background border-b items-center">
      {views.map((view) => {
        const config = view.config.getViewConfig();
        const type = config.type;
        return (
          <Button
            key={view.id}
            variant={viewMode === type ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode(type as ViewModeType)}
            title={view.config.name}
          >
            <span className="text-sm">{view.config.icon}</span>
            <span>{view.config.name}</span>
          </Button>
        );
      })}
    </div>
  );
}
