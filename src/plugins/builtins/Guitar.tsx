import { useState, useEffect } from "react";
import type { NubiumPlugin, PluginAPI } from "../PluginAPI";
import { ALL_TUNINGS, STANDARD_TUNING, type Tuning } from "../../model/guitar";
import type { Score } from "../../model";

const FRETTED_INSTRUMENTS = new Set(["guitar", "bass"]);

function FretboardPanel({ api }: { api: PluginAPI }) {
  const [score, setScore] = useState<Score>(api.getScore);
  const [partIndex, setPartIndex] = useState(() => api.getCursorPosition().partIndex);

  useEffect(() => {
    const onScore = (s: Score) => setScore(s);
    const onCursor = (c: { partIndex: number }) => setPartIndex(c.partIndex);
    api.on("scoreChanged", onScore);
    api.on("cursorChanged", onCursor);
    return () => {
      api.off("scoreChanged", onScore);
      api.off("cursorChanged", onCursor);
    };
  }, [api]);

  const part = score.parts[partIndex];
  if (!part || !FRETTED_INSTRUMENTS.has(part.instrumentId)) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        Select a fretted instrument part.
      </div>
    );
  }

  const currentTuning = part.tuning ?? STANDARD_TUNING;
  const capo = part.capo ?? 0;
  const matchedPreset = ALL_TUNINGS.find((t) =>
    t.strings.length === currentTuning.strings.length &&
    t.strings.every((s, i) => s === currentTuning.strings[i])
  );

  const applyTuning = (tuning: Tuning | undefined) => {
    const s = structuredClone(api.getScore());
    const p = s.parts[partIndex];
    if (!p) return;
    p.tuning = tuning;
    api.applyScore(s);
  };

  const applyCapo = (newCapo: number) => {
    const s = structuredClone(api.getScore());
    const p = s.parts[partIndex];
    if (!p) return;
    p.capo = newCapo;
    api.applyScore(s);
  };

  return (
    <div className="p-2.5 space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tuning</label>
        <select
          value={matchedPreset?.name ?? "__custom"}
          onChange={(e) => {
            const preset = ALL_TUNINGS.find((t) => t.name === e.target.value);
            applyTuning(preset ?? undefined);
          }}
          className="w-full h-6 text-[11px] rounded border border-input bg-background px-1.5"
        >
          {ALL_TUNINGS.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
          {!matchedPreset && <option value="__custom">Custom</option>}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Capo</label>
        <input
          type="text"
          value={capo}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= 0 && v <= 12) applyCapo(v);
            else if (e.target.value === "") applyCapo(0);
          }}
          className="w-8 h-6 text-center text-[11px] font-semibold rounded border border-input bg-background"
        />
      </div>
    </div>
  );
}

let sharedApi: PluginAPI | null = null;

export const GuitarPlugin: NubiumPlugin = {
  id: "nubium.fretboard",
  name: "Fretboard",
  version: "1.0.0",
  description: "Tuning and capo settings for fretted instruments",

  activate(api: PluginAPI) {
    sharedApi = api;
    api.registerPanel("fretboard.panel", {
      title: "Fretboard",
      location: "sidebar-left",
      component: () => sharedApi ? <FretboardPanel api={sharedApi} /> : null,
      defaultEnabled: true,
    });
  },

  deactivate() {
    sharedApi = null;
  },
};
