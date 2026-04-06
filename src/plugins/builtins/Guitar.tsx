import { useState, useEffect, useRef } from "react";
import type { NubiumPlugin, PluginAPI } from "../PluginAPI";
import { ALL_TUNINGS, STANDARD_TUNING, type Tuning } from "../../model/guitar";
import type { Score } from "../../model";

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const midiToNote = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

const GUITAR_INSTRUMENTS = new Set(["guitar", "bass"]);

function GuitarPanel({ api }: { api: PluginAPI }) {
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
  if (!part) return null;

  if (!GUITAR_INSTRUMENTS.has(part.instrumentId)) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        Select a guitar or bass part to configure tuning and capo.
      </div>
    );
  }

  const currentTuning = part.tuning ?? STANDARD_TUNING;
  const capo = part.capo ?? 0;
  const tuningDisplay = currentTuning.strings.map(midiToNote).reverse().join(" ");
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
    <div className="p-3 space-y-4">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {part.name}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium">Tuning</label>
        <select
          value={matchedPreset?.name ?? "__custom"}
          onChange={(e) => {
            const preset = ALL_TUNINGS.find((t) => t.name === e.target.value);
            applyTuning(preset ?? undefined);
          }}
          className="w-full h-7 text-[11px] rounded border border-input bg-background px-2"
        >
          {ALL_TUNINGS.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
          {!matchedPreset && <option value="__custom">Custom</option>}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium">Capo</label>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fret</span>
          <input
            type="text"
            value={capo}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 0 && v <= 12) applyCapo(v);
              else if (e.target.value === "") applyCapo(0);
            }}
            className="w-10 h-7 text-center text-sm font-semibold rounded border border-input bg-background"
          />
        </div>
      </div>
    </div>
  );
}

let sharedApi: PluginAPI | null = null;

export const GuitarPlugin: NubiumPlugin = {
  id: "nubium.guitar",
  name: "Guitar",
  version: "1.0.0",
  description: "Guitar tuning, capo, and string configuration",

  activate(api: PluginAPI) {
    sharedApi = api;
    api.registerPanel("guitar.panel", {
      title: "Guitar",
      location: "sidebar-left",
      component: () => sharedApi ? <GuitarPanel api={sharedApi} /> : null,
      defaultEnabled: true,
    });
  },

  deactivate() {
    sharedApi = null;
  },
};
