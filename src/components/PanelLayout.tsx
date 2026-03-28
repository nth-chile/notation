import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useLayoutStore } from "../state/LayoutState";
import { DraggablePanel } from "./DraggablePanel";
import type { PanelRegistration } from "../plugins/PluginManager";

interface PanelLayoutProps {
  leftPanels: PanelRegistration[];
  rightPanels: PanelRegistration[];
  children: React.ReactNode; // main content area
}

/** Map panel registrations by id for quick lookup */
function buildPanelMap(panels: PanelRegistration[]): Map<string, PanelRegistration> {
  const map = new Map<string, PanelRegistration>();
  for (const p of panels) {
    map.set(p.id, p);
  }
  return map;
}

function DroppableSidebar({
  id,
  panelIds,
  panelMap,
  isOpen,
}: {
  id: string;
  panelIds: string[];
  panelMap: Map<string, PanelRegistration>;
  isOpen: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (!isOpen) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...sidebarStyles.container,
        background: isOver ? "#eff6ff" : "#f1f5f9",
        borderRight: id === "left" ? "1px solid #e2e8f0" : undefined,
        borderLeft: id === "right" ? "1px solid #e2e8f0" : undefined,
      }}
    >
      <SortableContext items={panelIds} strategy={verticalListSortingStrategy}>
        {panelIds.map((panelId) => {
          const reg = panelMap.get(panelId);
          if (!reg) return null;
          return (
            <DraggablePanel key={panelId} id={panelId} title={reg.config.title}>
              {reg.config.component()}
            </DraggablePanel>
          );
        })}
      </SortableContext>

      {panelIds.length === 0 && (
        <div style={sidebarStyles.emptyDropZone}>
          Drop panels here
        </div>
      )}
    </div>
  );
}

export function PanelLayout({ leftPanels, rightPanels, children }: PanelLayoutProps) {
  const panels = useLayoutStore((s) => s.panels);
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const movePanel = useLayoutStore((s) => s.movePanel);
  const initLayout = useLayoutStore((s) => s.initLayout);

  const [activeId, setActiveId] = useState<string | null>(null);

  const allPanels = [...leftPanels, ...rightPanels];
  const panelMap = buildPanelMap(allPanels);

  // Initialize layout from available panels
  useEffect(() => {
    const available = [
      ...leftPanels.map((p) => ({ id: p.id, defaultSidebar: "left" as const })),
      ...rightPanels.map((p) => ({ id: p.id, defaultSidebar: "right" as const })),
    ];
    initLayout(available);
  }, [leftPanels.length, rightPanels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  /** Find which sidebar a panel is currently in */
  const findSidebar = useCallback(
    (panelId: string): "left" | "right" | null => {
      if (panels.left.includes(panelId)) return "left";
      if (panels.right.includes(panelId)) return "right";
      return null;
    },
    [panels]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      const activeSidebar = findSidebar(activeIdStr);

      // Determine the target sidebar
      let overSidebar: "left" | "right" | null = null;
      if (overIdStr === "left" || overIdStr === "right") {
        overSidebar = overIdStr;
      } else {
        overSidebar = findSidebar(overIdStr);
      }

      if (!activeSidebar || !overSidebar) return;
      if (activeSidebar === overSidebar) return;

      // Move panel to the other sidebar (at end)
      const targetList = panels[overSidebar];
      const overIndex = targetList.indexOf(overIdStr);
      const insertIndex = overIndex !== -1 ? overIndex : targetList.length;
      movePanel(activeIdStr, overSidebar, insertIndex);
    },
    [findSidebar, movePanel, panels]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      // If dropped on a sidebar container directly
      if (overIdStr === "left" || overIdStr === "right") {
        const currentSidebar = findSidebar(activeIdStr);
        if (currentSidebar !== overIdStr) {
          movePanel(activeIdStr, overIdStr, panels[overIdStr].length);
        }
        return;
      }

      // Reorder within the same sidebar
      const activeSidebar = findSidebar(activeIdStr);
      const overSidebar = findSidebar(overIdStr);

      if (!activeSidebar || !overSidebar) return;

      if (activeSidebar === overSidebar) {
        const list = panels[activeSidebar];
        const oldIndex = list.indexOf(activeIdStr);
        const newIndex = list.indexOf(overIdStr);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(list, oldIndex, newIndex);
          // Apply the reordered list via movePanel calls
          // We need to set the whole sidebar order, so we remove and re-add each
          // Actually, let's just set the state directly for efficiency
          useLayoutStore.setState((state) => {
            const newPanels = { ...state.panels, [activeSidebar]: reordered };
            // Persist
            try {
              localStorage.setItem(
                "notation-panel-layout",
                JSON.stringify({
                  panels: newPanels,
                  sidebarOpen: state.sidebarOpen,
                  panelCollapsed: state.panelCollapsed,
                })
              );
            } catch {
              // ignore
            }
            return { panels: newPanels };
          });
        }
      }
    },
    [findSidebar, movePanel, panels]
  );

  const activePanel = activeId ? panelMap.get(activeId) : null;

  const hasLeftPanels = panels.left.length > 0;
  const hasRightPanels = panels.right.length > 0;
  const showLeft = hasLeftPanels && sidebarOpen.left;
  const showRight = hasRightPanels && sidebarOpen.right;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={layoutStyles.container}>
        <DroppableSidebar
          id="left"
          panelIds={panels.left}
          panelMap={panelMap}
          isOpen={showLeft}
        />

        <div style={layoutStyles.mainContent}>{children}</div>

        <DroppableSidebar
          id="right"
          panelIds={panels.right}
          panelMap={panelMap}
          isOpen={showRight}
        />
      </div>

      <DragOverlay>
        {activeId && activePanel ? (
          <DraggablePanel id={activeId} title={activePanel.config.title} isOverlay>
            {activePanel.config.component()}
          </DraggablePanel>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const sidebarStyles: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    minWidth: 280,
    display: "flex",
    flexDirection: "column",
    padding: 6,
    gap: 4,
    overflowY: "auto",
    overflowX: "hidden",
    transition: "background 0.15s ease",
  },
  emptyDropZone: {
    padding: "24px 12px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    border: "2px dashed #cbd5e1",
    borderRadius: 6,
    margin: 4,
  },
};

const layoutStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  mainContent: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
};
