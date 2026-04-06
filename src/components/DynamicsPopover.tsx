import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../state";
import type { DynamicLevel } from "../model/annotations";
import type { BarlineType, DurationType, KeySignature, TimeSignature } from "../model";

const DYNAMIC_LEVELS: DynamicLevel[] = ["pp", "p", "mp", "mf", "f", "ff", "sfz", "fp"];

const KEY_SIGS: { label: string; fifths: number }[] = [
  { label: "C major", fifths: 0 },
  { label: "G major", fifths: 1 },
  { label: "D major", fifths: 2 },
  { label: "A major", fifths: 3 },
  { label: "E major", fifths: 4 },
  { label: "B major", fifths: 5 },
  { label: "F major", fifths: -1 },
  { label: "Bb major", fifths: -2 },
  { label: "Eb major", fifths: -3 },
  { label: "Ab major", fifths: -4 },
  { label: "Db major", fifths: -5 },
];

const BARLINES: { label: string; type: BarlineType }[] = [
  { label: "Single", type: "single" },
  { label: "Double", type: "double" },
  { label: "Final", type: "final" },
  { label: "|:", type: "repeat-start" },
  { label: ":|", type: "repeat-end" },
  { label: ":|:", type: "repeat-both" },
];

function usePopoverPosition() {
  const noteBoxes = useEditorStore((s) => s.noteBoxes);
  const cursor = useEditorStore((s) => s.inputState.cursor);
  const score = useEditorStore((s) => s.score);
  const measurePositions = useEditorStore((s) => s.measurePositions);

  const voice = score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
  const evt = voice?.events[cursor.eventIndex];
  const box = evt ? noteBoxes.get(evt.id) : null;

  if (box) return { top: box.y + box.height + 8, left: box.x };

  // Fall back to measure position
  const mp = measurePositions.find(
    (p) => p.partIndex === cursor.partIndex && p.measureIndex === cursor.measureIndex && p.staveIndex === 0,
  );
  if (mp) return { top: mp.y + mp.height + 8, left: mp.x + 60 };
  return { top: 100, left: 100 };
}

function DynamicsContent() {
  const setDynamic = useEditorStore((s) => s.setDynamic);
  return (
    <div className="flex gap-0.5">
      {DYNAMIC_LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => setDynamic(level)}
          className="px-2 py-1 text-sm font-serif italic hover:bg-accent rounded min-w-[32px]"
        >
          {level}
        </button>
      ))}
    </div>
  );
}

const SWING_OPTIONS = [
  { label: "Straight", value: "straight" },
  { label: "Swing", value: "swing" },
  { label: "Hard swing", value: "hard" },
  { label: "Shuffle", value: "shuffle" },
] as const;

function TempoContent() {
  const setTempoMark = useEditorStore((s) => s.setTempoMark);
  const setSwing = useEditorStore((s) => s.setSwing);
  const [value, setValue] = useState("120");
  const [swing, setSwingLocal] = useState("straight");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const bpm = parseInt(value, 10);
    if (bpm > 0 && bpm <= 400) setTempoMark(bpm);
  };

  const handleSwingChange = (val: string) => {
    setSwingLocal(val);
    if (val === "straight") setSwing({ style: "straight" });
    else if (val === "swing") setSwing({ style: "swing", ratio: 2 });
    else if (val === "hard") setSwing({ style: "swing", ratio: 3 });
    else if (val === "shuffle") setSwing({ style: "shuffle", ratio: 3, backbeatAccent: 25 });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">♩ =</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="w-16 px-2 py-1 text-sm bg-background border rounded outline-none"
          placeholder="120"
        />
        <button onClick={submit} className="px-2 py-1 text-sm hover:bg-accent rounded">Set</button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Feel</span>
        {SWING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSwingChange(opt.value)}
            className={`px-2 py-1 text-sm rounded ${swing === opt.value ? "bg-accent font-medium" : "hover:bg-accent/50"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeSigContent() {
  const changeTimeSig = useEditorStore((s) => s.changeTimeSig);
  const [value, setValue] = useState("4/4");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const match = value.match(/^(\d+)\/(\d+)$/);
    if (match) {
      const ts: TimeSignature = { numerator: parseInt(match[1]), denominator: parseInt(match[2]) as TimeSignature["denominator"] };
      changeTimeSig(ts);
      useEditorStore.getState().setPopover(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        className="w-16 px-2 py-1 text-sm bg-background border rounded outline-none"
        placeholder="4/4"
      />
      <button onClick={submit} className="px-2 py-1 text-sm hover:bg-accent rounded">Set</button>
    </div>
  );
}

function KeySigContent() {
  const changeKeySig = useEditorStore((s) => s.changeKeySig);
  const setPopover = useEditorStore((s) => s.setPopover);

  const select = (fifths: number) => {
    const ks: KeySignature = { fifths: fifths as KeySignature["fifths"] };
    changeKeySig(ks);
    setPopover(null);
  };

  return (
    <div className="grid grid-cols-3 gap-0.5 max-h-48 overflow-auto">
      {KEY_SIGS.map((k) => (
        <button
          key={k.fifths}
          onClick={() => select(k.fifths)}
          className="px-2 py-1 text-sm hover:bg-accent rounded text-left"
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}

function RehearsalContent() {
  const setRehearsalMark = useEditorStore((s) => s.setRehearsalMark);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (value.trim()) setRehearsalMark(value.trim());
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        className="w-20 px-2 py-1 text-sm bg-background border rounded outline-none"
        placeholder="A"
      />
      <button onClick={submit} className="px-2 py-1 text-sm hover:bg-accent rounded">Set</button>
    </div>
  );
}

function BarlineContent() {
  const setRepeatBarline = useEditorStore((s) => s.setRepeatBarline);
  const setPopover = useEditorStore((s) => s.setPopover);

  return (
    <div className="flex gap-0.5">
      {BARLINES.map((b) => (
        <button
          key={b.type}
          onClick={() => { setRepeatBarline(b.type); setPopover(null); }}
          className="px-2 py-1 text-sm hover:bg-accent rounded"
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

function GoToMeasureContent() {
  const setPopover = useEditorStore((s) => s.setPopover);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const go = () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    const store = useEditorStore.getState();
    const part = store.score.parts[store.inputState.cursor.partIndex];
    if (!part) return;
    const measureIndex = Math.min(num - 1, part.measures.length - 1);
    store.setCursorDirect({
      ...store.inputState.cursor,
      measureIndex,
      eventIndex: 0,
    });
    setPopover(null);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Measure #"
        className="w-20 px-2 py-1 text-sm bg-background border rounded"
      />
      <button type="submit" className="px-2 py-1 text-sm hover:bg-accent rounded">Go</button>
    </form>
  );
}

const DS_OPTIONS = [
  { label: "D.S. al Coda", value: "D.S. al Coda" },
  { label: "D.S. al Fine", value: "D.S. al Fine" },
  { label: "D.S.", value: "D.S." },
];

const DC_OPTIONS = [
  { label: "D.C. al Fine", value: "D.C. al Fine" },
  { label: "D.C. al Coda", value: "D.C. al Coda" },
  { label: "D.C.", value: "D.C." },
];

function MusicGlyph({ code }: { code: string }) {
  return <span style={{ fontFamily: "Bravura, Petaluma, serif", fontSize: "20px", lineHeight: 1 }}>{code}</span>;
}

function NavigationMarksContent() {
  const setNavigationMark = useEditorStore((s) => s.setNavigationMark);
  const setVolta = useEditorStore((s) => s.setVolta);
  const setPopover = useEditorStore((s) => s.setPopover);
  const score = useEditorStore((s) => s.score);
  const cursor = useEditorStore((s) => s.inputState.cursor);
  const [voltaInput, setVoltaInput] = useState("");
  const voltaRef = useRef<HTMLInputElement>(null);

  // Get current navigation state for the measure
  const measure = score.parts[cursor.partIndex]?.measures[cursor.measureIndex];
  const nav = measure?.navigation;

  const toggleMark = (type: "coda" | "segno" | "toCoda" | "fine") => {
    setNavigationMark(type);
  };

  const setDS = (value: string) => {
    const isActive = nav?.dsText === value;
    if (isActive) {
      setNavigationMark("ds"); // toggle off
    } else {
      setNavigationMark("ds", value);
    }
  };

  const setDC = (value: string) => {
    const isActive = nav?.dcText === value;
    if (isActive) {
      setNavigationMark("dc"); // toggle off
    } else {
      setNavigationMark("dc", value);
    }
  };

  const submitVolta = () => {
    const text = voltaInput.trim();
    if (!text) {
      setVolta(null); // remove
      return;
    }
    const endings = text.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (endings.length > 0) {
      setVolta({ endings });
      setPopover(null);
    }
  };

  const activeClass = "bg-accent font-medium";
  const inactiveClass = "hover:bg-accent/50";

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      {/* Signs */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Signs</div>
        <div className="flex gap-0.5">
          {([
            { type: "segno" as const, label: <MusicGlyph code={"\uE047"} />, active: !!nav?.segno },
            { type: "coda" as const, label: <MusicGlyph code={"\uE048"} />, active: !!nav?.coda },
            { type: "toCoda" as const, label: "To Coda" as unknown as React.ReactElement, active: !!nav?.toCoda },
            { type: "fine" as const, label: "Fine" as unknown as React.ReactElement, active: !!nav?.fine },
          ] as { type: "segno" | "coda" | "toCoda" | "fine"; label: React.ReactNode; active: boolean }[]).map((m) => (
            <button
              key={m.type}
              onClick={() => toggleMark(m.type)}
              className={`px-2 py-1 text-sm rounded flex items-center justify-center min-w-[40px] ${m.active ? activeClass : inactiveClass}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {/* D.S. */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Dal Segno</div>
        <div className="flex gap-0.5">
          {DS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDS(opt.value)}
              className={`px-2 py-1 text-sm rounded ${nav?.dsText === opt.value ? activeClass : inactiveClass}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {/* D.C. */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Da Capo</div>
        <div className="flex gap-0.5">
          {DC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDC(opt.value)}
              className={`px-2 py-1 text-sm rounded ${nav?.dcText === opt.value ? activeClass : inactiveClass}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {/* Volta */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
          Volta {nav?.volta ? `(${nav.volta.endings.join(", ")})` : ""}
        </div>
        <div className="flex gap-1">
          <input
            ref={voltaRef}
            value={voltaInput}
            onChange={(e) => setVoltaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitVolta(); }}
            className="w-20 px-2 py-1 text-sm bg-background border rounded outline-none"
            placeholder="1, 2"
          />
          <button onClick={submitVolta} className="px-2 py-1 text-sm hover:bg-accent rounded">Set</button>
          {nav?.volta && (
            <button
              onClick={() => { setVolta(null); }}
              className="px-2 py-1 text-sm hover:bg-destructive/20 text-destructive rounded"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const FLOATING_POPOVERS = new Set(["go-to-measure"]);

const CONTENT: Record<string, () => React.ReactNode> = {
  dynamics: DynamicsContent,
  tempo: TempoContent,
  "time-sig": TimeSigContent,
  "key-sig": KeySigContent,
  rehearsal: RehearsalContent,
  barline: BarlineContent,
  "go-to-measure": GoToMeasureContent,
  "navigation-marks": NavigationMarksContent,
};

const LABELS: Record<string, string> = {
  dynamics: "Dynamics",
  tempo: "Tempo",
  "time-sig": "Time Signature",
  "key-sig": "Key Signature",
  rehearsal: "Rehearsal Mark",
  barline: "Barline",
  "go-to-measure": "Go to Measure",
  "navigation-marks": "Navigation Marks",
};

export function AnnotationPopover() {
  const popover = useEditorStore((s) => s.popover);
  const setPopover = useEditorStore((s) => s.setPopover);
  const ref = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition();

  useEffect(() => {
    if (!popover) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); setPopover(null); }
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null);
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [popover, setPopover]);

  if (!popover) return null;

  const Content = CONTENT[popover];
  if (!Content) return null;

  const isFloating = FLOATING_POPOVERS.has(popover);

  return (
    <div
      ref={ref}
      style={isFloating
        ? { position: "fixed", zIndex: 50, top: "30%", left: "50%", transform: "translateX(-50%)" }
        : { position: "absolute", zIndex: 50, top: pos.top, left: pos.left }
      }
      className="bg-popover border rounded-lg shadow-lg p-2"
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{LABELS[popover]}</div>
      <Content />
    </div>
  );
}
