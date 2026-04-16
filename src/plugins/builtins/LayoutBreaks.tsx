import type { NubiumPlugin, PluginAPI } from "../PluginAPI";
import type { Score, MeasureBreak } from "../../model";
import { useEditorStore } from "../../state";

interface BreakEntry {
  partIndex: number;
  measureIndex: number;
  kind: MeasureBreak;
}

function collectBreaks(score: Score): BreakEntry[] {
  const out: BreakEntry[] = [];
  // Breaks are applied globally via SetMeasureBreak, so we read from part 0.
  const part = score.parts[0];
  if (!part) return out;
  for (let mi = 0; mi < part.measures.length; mi++) {
    const br = part.measures[mi].break;
    if (br) out.push({ partIndex: 0, measureIndex: mi, kind: br });
  }
  return out;
}

const BREAK_LABEL: Record<MeasureBreak, string> = {
  system: "System break",
  page: "Page break",
  section: "Section break",
};

const BreakIcon = ({ kind }: { kind: MeasureBreak }) => {
  const props = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor" } as const;
  const sw = { strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "system") {
    // Return/line-break arrow
    return (
      <svg {...props}>
        <polyline points="12,3 12,10 4,10" {...sw} />
        <polyline points="7,7 4,10 7,13" {...sw} />
      </svg>
    );
  }
  if (kind === "page") {
    // Page with corner fold and horizontal break line
    return (
      <svg {...props}>
        <path d="M4,2 L10,2 L13,5 L13,14 L4,14 Z" {...sw} />
        <polyline points="10,2 10,5 13,5" {...sw} />
        <line x1="2" y1="9" x2="15" y2="9" {...sw} strokeDasharray="2 1.5" />
      </svg>
    );
  }
  // Section break: double vertical lines
  return (
    <svg {...props}>
      <line x1="6" y1="3" x2="6" y2="13" {...sw} />
      <line x1="10" y1="3" x2="10" y2="13" {...sw} />
    </svg>
  );
};

function LayoutBreaksPanel(_: { api: PluginAPI }) {
  const score = useEditorStore((s) => s.score);
  const cursorMeasure = useEditorStore((s) => s.inputState.cursor.measureIndex);

  const currentBreak = score.parts[0]?.measures[cursorMeasure]?.break;
  const breaks = collectBreaks(score);

  const setBreak = (kind: MeasureBreak | null) => {
    useEditorStore.getState().setMeasureBreak(kind);
  };

  const jumpToMeasure = (measureIndex: number) => {
    useEditorStore.setState((s) => ({
      inputState: {
        ...s.inputState,
        cursor: { ...s.inputState.cursor, measureIndex, eventIndex: 0 },
      },
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-3">
      <div>
        <div className="flex flex-wrap gap-1">
          {(["system", "page", "section"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setBreak(currentBreak === k ? null : k)}
              title={BREAK_LABEL[k]}
              className={`h-7 px-2 flex items-center gap-1 rounded border border-input text-xs transition-colors focus:outline-none ${
                currentBreak === k ? "bg-accent" : "bg-background hover:bg-accent"
              }`}
            >
              <BreakIcon kind={k} />
              <span>{BREAK_LABEL[k].replace(" break", "")}</span>
            </button>
          ))}
          {currentBreak && (
            <button
              onClick={() => setBreak(null)}
              title="Clear break"
              className="h-7 px-2 flex items-center rounded border border-input bg-background hover:bg-accent text-xs transition-colors focus:outline-none"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {breaks.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            All breaks
          </div>
          <div className="space-y-0.5">
            {breaks.map((b) => (
              <button
                key={`${b.measureIndex}-${b.kind}`}
                onClick={() => jumpToMeasure(b.measureIndex)}
                className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-accent text-xs focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <BreakIcon kind={b.kind} />
                  <span className="text-muted-foreground capitalize">{b.kind}</span>
                </span>
                <span className="text-muted-foreground">m. {b.measureIndex + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

let sharedApi: PluginAPI | null = null;

export const LayoutBreaksPlugin: NubiumPlugin = {
  id: "nubium.layout-breaks",
  name: "Layout Breaks",
  version: "1.0.0",
  description: "Force system, page, and section breaks at measure boundaries",

  activate(api: PluginAPI) {
    sharedApi = api;

    // Commands — bindable via keybindings.ts
    api.registerCommand("nubium.break-system", "Toggle system break", () => {
      const st = useEditorStore.getState();
      const mi = st.inputState.cursor.measureIndex;
      const current = st.score.parts[0]?.measures[mi]?.break;
      st.setMeasureBreak(current === "system" ? null : "system");
    });
    api.registerCommand("nubium.break-page", "Toggle page break", () => {
      const st = useEditorStore.getState();
      const mi = st.inputState.cursor.measureIndex;
      const current = st.score.parts[0]?.measures[mi]?.break;
      st.setMeasureBreak(current === "page" ? null : "page");
    });
    api.registerCommand("nubium.break-section", "Toggle section break", () => {
      const st = useEditorStore.getState();
      const mi = st.inputState.cursor.measureIndex;
      const current = st.score.parts[0]?.measures[mi]?.break;
      st.setMeasureBreak(current === "section" ? null : "section");
    });
    api.registerCommand("nubium.break-clear", "Clear break", () => {
      useEditorStore.getState().setMeasureBreak(null);
    });

    api.registerPanel("layout-breaks.panel", {
      title: "Layout Breaks",
      location: "sidebar-left",
      component: () => (sharedApi ? <LayoutBreaksPanel api={sharedApi} /> : null),
      defaultEnabled: false,
    });
  },

  deactivate() {
    sharedApi = null;
  },
};
