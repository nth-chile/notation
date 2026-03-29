import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLayoutStore } from "../state/LayoutState";
import { cn } from "@/lib/utils";
import { ChevronDown, GripVertical, MoreVertical } from "lucide-react";

import type { PanelMenuItem } from "../plugins/PluginAPI";

interface DraggablePanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isOverlay?: boolean;
  menuItems?: PanelMenuItem[];
  fill?: boolean;
}

export function DraggablePanel({ id, title, children, isOverlay, menuItems, fill }: DraggablePanelProps) {
  const collapsed = useLayoutStore((s) => s.panelCollapsed[id] ?? false);
  const toggleCollapsed = useLayoutStore((s) => s.togglePanelCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-background overflow-hidden flex flex-col",
        fill && "flex-1 min-h-0",
        isDragging && "opacity-40",
        isOverlay && "shadow-lg border rounded-md"
      )}
      {...attributes}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-card select-none">
        <div className="cursor-grab p-0.5 rounded-sm hover:bg-accent" {...listeners} title="Drag to reorder">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>

        <span
          className="flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate cursor-pointer"
          onClick={() => toggleCollapsed(id)}
        >
          {title}
        </span>

        <button
          onClick={() => toggleCollapsed(id)}
          className="p-0.5 rounded-sm hover:bg-accent cursor-pointer"
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-150",
              collapsed && "-rotate-90"
            )}
          />
        </button>

        {menuItems && menuItems.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded-sm hover:bg-accent cursor-pointer"
              title="Panel options"
            >
              <MoreVertical className="h-3 w-3 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-50 py-1 min-w-[120px]">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.onClick(); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className={cn("overflow-auto", fill && "flex-1 min-h-0")}>
          {children}
        </div>
      )}
    </div>
  );
}
