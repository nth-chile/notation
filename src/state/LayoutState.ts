import { create } from "zustand";

const STORAGE_KEY = "notation-panel-layout";

export interface PanelLayoutEntry {
  panelId: string;
  sidebar: "left" | "right";
  index: number;
  collapsed: boolean;
}

export interface LayoutState {
  /** Ordered panel IDs for each sidebar */
  panels: Record<"left" | "right", string[]>;
  /** Whether each sidebar is open (visible) */
  sidebarOpen: Record<"left" | "right", boolean>;
  /** Collapsed state per panel */
  panelCollapsed: Record<string, boolean>;

  movePanel: (panelId: string, toSidebar: "left" | "right", toIndex: number) => void;
  toggleSidebar: (side: "left" | "right") => void;
  togglePanelCollapsed: (panelId: string) => void;
  /** Initialize layout with available panel IDs, merging with persisted state */
  initLayout: (availablePanels: { id: string; defaultSidebar: "left" | "right" }[]) => void;
}

function loadPersistedLayout(): {
  panels?: Record<"left" | "right", string[]>;
  sidebarOpen?: Record<"left" | "right", boolean>;
  panelCollapsed?: Record<string, boolean>;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function persistLayout(state: Pick<LayoutState, "panels" | "sidebarOpen" | "panelCollapsed">) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        panels: state.panels,
        sidebarOpen: state.sidebarOpen,
        panelCollapsed: state.panelCollapsed,
      })
    );
  } catch {
    // ignore
  }
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  panels: { left: [], right: [] },
  sidebarOpen: { left: true, right: true },
  panelCollapsed: {},

  movePanel: (panelId, toSidebar, toIndex) => {
    set((state) => {
      const newPanels = {
        left: [...state.panels.left],
        right: [...state.panels.right],
      };

      // Remove from current location
      for (const side of ["left", "right"] as const) {
        const idx = newPanels[side].indexOf(panelId);
        if (idx !== -1) {
          newPanels[side].splice(idx, 1);
        }
      }

      // Insert at new location
      const clampedIndex = Math.min(toIndex, newPanels[toSidebar].length);
      newPanels[toSidebar].splice(clampedIndex, 0, panelId);

      const next = { ...state, panels: newPanels };
      persistLayout(next);
      return next;
    });
  },

  toggleSidebar: (side) => {
    set((state) => {
      const next = {
        ...state,
        sidebarOpen: {
          ...state.sidebarOpen,
          [side]: !state.sidebarOpen[side],
        },
      };
      persistLayout(next);
      return next;
    });
  },

  togglePanelCollapsed: (panelId) => {
    set((state) => {
      const next = {
        ...state,
        panelCollapsed: {
          ...state.panelCollapsed,
          [panelId]: !state.panelCollapsed[panelId],
        },
      };
      persistLayout(next);
      return next;
    });
  },

  initLayout: (availablePanels) => {
    const persisted = loadPersistedLayout();
    const availableIds = new Set(availablePanels.map((p) => p.id));

    if (persisted?.panels) {
      // Filter out panels that no longer exist
      const left = persisted.panels.left.filter((id) => availableIds.has(id));
      const right = persisted.panels.right.filter((id) => availableIds.has(id));
      const assigned = new Set([...left, ...right]);

      // Add any new panels not in persisted state
      for (const p of availablePanels) {
        if (!assigned.has(p.id)) {
          if (p.defaultSidebar === "left") {
            left.push(p.id);
          } else {
            right.push(p.id);
          }
        }
      }

      set({
        panels: { left, right },
        sidebarOpen: persisted.sidebarOpen ?? { left: true, right: true },
        panelCollapsed: persisted.panelCollapsed ?? {},
      });
    } else {
      // No persisted state — use defaults
      const left: string[] = [];
      const right: string[] = [];
      for (const p of availablePanels) {
        if (p.defaultSidebar === "left") {
          left.push(p.id);
        } else {
          right.push(p.id);
        }
      }
      set({
        panels: { left, right },
        sidebarOpen: { left: true, right: true },
        panelCollapsed: {},
      });
    }
  },
}));
