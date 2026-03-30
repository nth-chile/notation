import React, { useMemo, useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "../state";
import { useLayoutStore } from "../state/LayoutState";
import { useHotkey } from "../hooks/useHotkey";
import { TooltipButton } from "./ui/tooltip-button";
import { Separator } from "./ui/separator";
import { PanelLeft, PanelRight, Undo2, Redo2, Settings, Puzzle, GripVertical } from "lucide-react";
import { Button } from "./ui/button";
import { ContextMenu, ContextMenuCheckbox, ContextMenuSeparator, ContextMenuItem, ContextMenuLabel } from "./ui/context-menu";
import { cn } from "@/lib/utils";
import type { PanelRegistration, ViewEntry } from "../plugins/PluginManager";
import type { ViewModeType } from "../views/ViewMode";

/** A toolbar group definition */
export interface ToolbarGroup {
  id: string;
  label: string;
  /** Which toolbar row this group defaults to */
  defaultRow: "primary" | "secondary";
  component: () => React.ReactNode;
}

interface ToolbarProps {
  onToggleSettings?: () => void;
  onTogglePlugins?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  toolbarPanels?: PanelRegistration[];
  views?: ViewEntry[];
}

function ViewSwitcher({ views }: { views: ViewEntry[] }) {
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-0.5">
      {views.map((view) => {
        const config = view.config.getViewConfig();
        return (
          <Button
            key={view.id}
            variant={viewMode === config.type ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode(config.type as ViewModeType)}
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

/** A single sortable group in a toolbar row */
function SortableToolbarGroup({ group, isOverlay }: { group: ToolbarGroup; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded px-1",
        isDragging && "opacity-40",
        isOverlay && "bg-popover shadow-lg border rounded-md px-2 py-1"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        title={`Drag to reorder "${group.label}"`}
      >
        <GripVertical className="h-3 w-3" />
      </div>
      {group.component()}
    </div>
  );
}

/** Resolves which groups appear in a given row, respecting persisted order */
function useToolbarRow(
  row: "primary" | "secondary",
  allGroups: ToolbarGroup[],
) {
  const toolbarOrder = useLayoutStore((s) => s.toolbarOrder);
  const toolbarHidden = useLayoutStore((s) => s.toolbarHidden);

  return useMemo(() => {
    const persistedRow = toolbarOrder[row];
    // Groups explicitly assigned to this row
    const assigned = new Set(persistedRow);
    // Groups explicitly assigned to the other row
    const otherRow = row === "primary" ? "secondary" : "primary";
    const assignedOther = new Set(toolbarOrder[otherRow]);

    // Build ordered list: persisted order first, then unassigned defaults
    const ordered: ToolbarGroup[] = [];
    const seen = new Set<string>();

    // First: groups in persisted order for this row
    for (const id of persistedRow) {
      const g = allGroups.find((g) => g.id === id);
      if (g) {
        ordered.push(g);
        seen.add(id);
      }
    }

    // Then: groups not in any persisted row that default to this row
    for (const g of allGroups) {
      if (!seen.has(g.id) && !assigned.has(g.id) && !assignedOther.has(g.id) && g.defaultRow === row) {
        ordered.push(g);
      }
    }

    const visible = ordered.filter((g) => !toolbarHidden.includes(g.id));
    return { ordered, visible };
  }, [row, allGroups, toolbarOrder, toolbarHidden]);
}

function DraggableToolbarRow({
  row,
  groups,
  allGroups,
  className,
}: {
  row: "primary" | "secondary";
  groups: ToolbarGroup[];
  allGroups: ToolbarGroup[];
  className?: string;
}) {
  const setToolbarOrder = useLayoutStore((s) => s.setToolbarOrder);
  const toolbarOrder = useLayoutStore((s) => s.toolbarOrder);
  const toolbarHidden = useLayoutStore((s) => s.toolbarHidden);
  const toggleToolbarGroup = useLayoutStore((s) => s.toggleToolbarGroup);
  const moveToolbarGroup = useLayoutStore((s) => s.moveToolbarGroup);
  const resetToolbar = useLayoutStore((s) => s.resetToolbar);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = groups.map((g) => g.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(ids, oldIndex, newIndex);
      // Append hidden items that belong to this row
      const hiddenInRow = toolbarOrder[row].filter((id) => toolbarHidden.includes(id));
      setToolbarOrder(row, [...reordered, ...hiddenInRow]);
    },
    [groups, toolbarOrder, toolbarHidden, row, setToolbarOrder]
  );

  const activeGroup = activeId ? allGroups.find((g) => g.id === activeId) : null;
  const otherRow = row === "primary" ? "secondary" : "primary";
  const otherLabel = row === "primary" ? "secondary" : "primary";

  const toolbar = (
    <div className={cn("flex items-center gap-1 px-2 py-1 border-b shrink-0", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={groups.map((g) => g.id)} strategy={horizontalListSortingStrategy}>
          {groups.map((group, i) => (
            <React.Fragment key={group.id}>
              {i > 0 && <Separator orientation="vertical" />}
              <SortableToolbarGroup group={group} />
            </React.Fragment>
          ))}
        </SortableContext>

        <DragOverlay>
          {activeGroup ? <SortableToolbarGroup group={activeGroup} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );

  return (
    <ContextMenu trigger={toolbar}>
      <ContextMenuLabel>Toolbar groups</ContextMenuLabel>
      {allGroups.map((group) => (
        <ContextMenuCheckbox
          key={group.id}
          checked={!toolbarHidden.includes(group.id)}
          onCheckedChange={() => toggleToolbarGroup(group.id)}
        >
          {group.label}
        </ContextMenuCheckbox>
      ))}
      {groups.length > 0 && (
        <>
          <ContextMenuSeparator />
          <ContextMenuLabel>Move to {otherLabel} toolbar</ContextMenuLabel>
          {groups.map((group) => (
            <ContextMenuItem key={group.id} onClick={() => moveToolbarGroup(group.id, otherRow)}>
              {group.label}
            </ContextMenuItem>
          ))}
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={resetToolbar}>Reset toolbar</ContextMenuItem>
    </ContextMenu>
  );
}

export function Toolbar({ onToggleSettings, onTogglePlugins, onNew, onOpen, onSave, toolbarPanels = [], views = [] }: ToolbarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const hotkey = useHotkey();

  const panels = useLayoutStore((s) => s.panels);
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toolbarHidden = useLayoutStore((s) => s.toolbarHidden);
  const toggleToolbarGroup = useLayoutStore((s) => s.toggleToolbarGroup);
  const resetToolbar = useLayoutStore((s) => s.resetToolbar);
  const hasLeftPanels = panels.left.length > 0;
  const hasRightPanels = panels.right.length > 0;

  // Build all toolbar groups (plugins + views only)
  const allGroups: ToolbarGroup[] = useMemo(() => {
    const groups: ToolbarGroup[] = [];
    if (views.length > 0) {
      groups.push({
        id: "view-switcher",
        label: "Views",
        defaultRow: "primary",
        component: () => <ViewSwitcher views={views} />,
      });
    }
    for (const panel of toolbarPanels) {
      groups.push({
        id: panel.id,
        label: panel.config.title,
        defaultRow: "secondary",
        component: panel.config.component,
      });
    }
    return groups;
  }, [toolbarPanels, views]);

  const primary = useToolbarRow("primary", allGroups);
  const secondary = useToolbarRow("secondary", allGroups);

  const contextMenuContent = (
    <>
      <ContextMenuLabel>Toolbar groups</ContextMenuLabel>
      {allGroups.map((group) => (
        <ContextMenuCheckbox
          key={group.id}
          checked={!toolbarHidden.includes(group.id)}
          onCheckedChange={() => toggleToolbarGroup(group.id)}
        >
          {group.label}
        </ContextMenuCheckbox>
      ))}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={resetToolbar}>Reset toolbar</ContextMenuItem>
    </>
  );

  return (
    <>
      {/* Primary toolbar — app-level controls */}
      <ContextMenu
        trigger={
          <div className="flex items-center gap-1 px-2 py-1 border-b bg-card shrink-0">
            <div className="flex items-center gap-1">
              <TooltipButton variant="ghost" size="icon" onClick={undo} tooltip={`Undo (${hotkey("undo")})`}>
                <Undo2 className="h-4 w-4" />
              </TooltipButton>
              <TooltipButton variant="ghost" size="icon" onClick={redo} tooltip={`Redo (${hotkey("redo")})`}>
                <Redo2 className="h-4 w-4" />
              </TooltipButton>
            </div>

            <Separator orientation="vertical" />

            <div className="flex items-center gap-1">
              {onNew && (
                <TooltipButton variant="ghost" size="sm" onClick={onNew} tooltip={`New score (${hotkey("file:new")})`}>
                  New
                </TooltipButton>
              )}
              {onOpen && (
                <TooltipButton variant="ghost" size="sm" onClick={onOpen} tooltip={`Open file (${hotkey("file:open")})`}>
                  Open
                </TooltipButton>
              )}
              {onSave && (
                <TooltipButton variant="ghost" size="sm" onClick={onSave} tooltip={`Save file (${hotkey("file:save")})`}>
                  Save
                </TooltipButton>
              )}
            </div>

            {primary.visible.length > 0 && <Separator orientation="vertical" />}

            {primary.visible.length > 0 && (
              <DraggableToolbarRow
                row="primary"
                groups={primary.visible}
                allGroups={allGroups}
                className="border-b-0 px-0 py-0"
              />
            )}

            <div className="flex-1" />

            {onTogglePlugins && (
              <TooltipButton variant="ghost" size="icon" onClick={onTogglePlugins} tooltip={`Plugins (${hotkey("toggle-plugins")})`}>
                <Puzzle className="h-4 w-4" />
              </TooltipButton>
            )}

            {onToggleSettings && (
              <TooltipButton variant="ghost" size="icon" onClick={onToggleSettings} tooltip={`Settings (${hotkey("toggle-settings")})`}>
                <Settings className="h-4 w-4" />
              </TooltipButton>
            )}
          </div>
        }
      >
        {contextMenuContent}
      </ContextMenu>

      {/* Secondary toolbar — sidebar toggles + draggable plugin groups */}
      <ContextMenu
        trigger={
          <div className="flex items-center gap-1 px-2 py-1 border-b bg-card/50 shrink-0">
            {hasLeftPanels && (
              <TooltipButton
                variant={sidebarOpen.left ? "secondary" : "ghost"}
                size="icon"
                onClick={() => toggleSidebar("left")}
                tooltip={`${sidebarOpen.left ? "Hide left sidebar" : "Show left sidebar"} (${hotkey("toggle-left-sidebar")})`}
              >
                <PanelLeft className="h-4 w-4" />
              </TooltipButton>
            )}

            {hasLeftPanels && secondary.visible.length > 0 && (
              <Separator orientation="vertical" />
            )}

            {secondary.visible.length > 0 && (
              <DraggableToolbarRow
                row="secondary"
                groups={secondary.visible}
                allGroups={allGroups}
                className="border-b-0 px-0 py-0"
              />
            )}

            <div className="flex-1" />

            {hasRightPanels && (
              <TooltipButton
                variant={sidebarOpen.right ? "secondary" : "ghost"}
                size="icon"
                onClick={() => toggleSidebar("right")}
                tooltip={`${sidebarOpen.right ? "Hide right sidebar" : "Show right sidebar"} (${hotkey("toggle-right-sidebar")})`}
              >
                <PanelRight className="h-4 w-4" />
              </TooltipButton>
            )}
          </div>
        }
      >
        {contextMenuContent}
      </ContextMenu>
    </>
  );
}
