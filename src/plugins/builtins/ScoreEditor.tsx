import type { PluginManager } from "../PluginManager";
import { useEditorStore } from "../../state";
import { useHotkey } from "../../hooks/useHotkey";
import { exportToMusicXML } from "../../musicxml/export";
import type { DurationType, Accidental } from "../../model";
import { Separator } from "@/components/ui/separator";
import { TooltipButton } from "@/components/ui/tooltip-button";

/** SVG note icons for duration buttons */
function NoteIcon({ type, className }: { type: DurationType; className?: string }) {
  const size = 16;
  const headY = 11;
  const stemTop = 2;
  const filledStemX = 11.2;
  const openStemX = 12;
  const filledStem = <line x1={filledStemX} y1={headY} x2={filledStemX} y2={stemTop} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />;
  const openStem = <line x1={openStemX} y1={headY} x2={openStemX} y2={stemTop} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />;
  const filledHead = <ellipse cx={8} cy={headY} rx="4" ry="3" fill="currentColor" transform="rotate(-20 8 11)" />;
  const openHead = <ellipse cx={8} cy={headY} rx="4" ry="3" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-20 8 11)" />;
  const flag = (count: number) => {
    const sx = filledStemX;
    const flags = [];
    for (let i = 0; i < count; i++) {
      const y = stemTop + i * 4;
      flags.push(<path key={i} d={`M${sx},${y} Q${sx + 5},${y + 2} ${sx + 3},${y + 5}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />);
    }
    return <>{flags}</>;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {type === "whole" && (
        <ellipse cx={8} cy={headY} rx="4" ry="3" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-20 8 11)" />
      )}
      {type === "half" && <>{openHead}{openStem}</>}
      {type === "quarter" && <>{filledHead}{filledStem}</>}
      {type === "eighth" && <>{filledHead}{filledStem}{flag(1)}</>}
      {type === "16th" && <>{filledHead}{filledStem}{flag(2)}</>}
      {type === "32nd" && <>{filledHead}{filledStem}{flag(3)}</>}
    </svg>
  );
}

const DURATIONS: { type: DurationType; icon: React.ReactNode; actionId: string }[] = [
  { type: "whole", icon: <NoteIcon type="whole" />, actionId: "duration:whole" },
  { type: "half", icon: <NoteIcon type="half" />, actionId: "duration:half" },
  { type: "quarter", icon: <NoteIcon type="quarter" />, actionId: "duration:quarter" },
  { type: "eighth", icon: <NoteIcon type="eighth" />, actionId: "duration:eighth" },
  { type: "16th", icon: <NoteIcon type="16th" />, actionId: "duration:16th" },
  { type: "32nd", icon: <NoteIcon type="32nd" />, actionId: "duration:32nd" },
];

const ACCIDENTALS: { acc: Accidental; label: string }[] = [
  { acc: "flat", label: "\u266D" },
  { acc: "natural", label: "\u266E" },
  { acc: "sharp", label: "\u266F" },
];

function ModesPanel() {
  const inputState = useEditorStore((s) => s.inputState);
  const toggleStepEntry = useEditorStore((s) => s.toggleStepEntry);
  const toggleInsertMode = useEditorStore((s) => s.toggleInsertMode);
  const toggleGraceNoteMode = useEditorStore((s) => s.toggleGraceNoteMode);
  const togglePitchBeforeDuration = useEditorStore((s) => s.togglePitchBeforeDuration);
  const hotkey = useHotkey();

  return (
    <div className="flex items-center gap-1">
      <TooltipButton
        variant={inputState.stepEntry ? "default" : "ghost"}
        size="icon"
        onClick={toggleStepEntry}
        tooltip={`Step entry (${hotkey("toggle-step-entry")})`}
        actionId="toggle-step-entry"
        className="text-xs font-bold"
      >
        N
      </TooltipButton>
      {inputState.stepEntry && (
        <TooltipButton
          variant={inputState.insertMode ? "default" : "ghost"}
          size="icon"
          onClick={toggleInsertMode}
          tooltip={`Insert mode (${hotkey("toggle-insert-mode")})`}
          actionId="toggle-insert-mode"
          className="text-xs font-bold"
        >
          I
        </TooltipButton>
      )}
      <TooltipButton
        variant={inputState.graceNoteMode ? "default" : "ghost"}
        size="icon"
        onClick={toggleGraceNoteMode}
        tooltip={`Grace note (${hotkey("toggle-grace-note")})`}
        actionId="toggle-grace-note"
      >
        <svg width="12" height="16" viewBox="0 0 12 16">
          <ellipse cx="4.5" cy="12" rx="3" ry="2.2" fill="currentColor" transform="rotate(-20 4.5 12)" />
          <line x1="6.5" y1="12" x2="6.5" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M6.5,3 Q10,4 9,7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="3" y1="8" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </TooltipButton>
      <TooltipButton
        variant={inputState.pitchBeforeDuration ? "default" : "ghost"}
        size="icon"
        onClick={togglePitchBeforeDuration}
        tooltip={`Pitch before duration (${hotkey("toggle-pitch-before-duration")})`}
        actionId="toggle-pitch-before-duration"
      >
        <svg width="14" height="16" viewBox="0 0 14 16">
          <text x="7" y="6.5" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" fontFamily="sans-serif">A</text>
          <ellipse cx="5" cy="13" rx="2.5" ry="1.8" fill="currentColor" transform="rotate(-20 5 13)" />
          <line x1="6.8" y1="13" x2="6.8" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </TooltipButton>
    </div>
  );
}

function DurationPanel() {
  const inputState = useEditorStore((s) => s.inputState);
  const setDuration = useEditorStore((s) => s.setDuration);
  const toggleDot = useEditorStore((s) => s.toggleDot);
  const hotkey = useHotkey();

  return (
    <div className="flex items-center gap-1">
      {DURATIONS.map((d) => (
        <TooltipButton
          key={d.type}
          variant={inputState.duration.type === d.type ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setDuration(d.type)}
          tooltip={`${d.type} (${hotkey(d.actionId)})`}
          actionId={d.actionId}
        >
          {d.icon}
        </TooltipButton>
      ))}
      <TooltipButton
        variant={inputState.duration.dots > 0 ? "secondary" : "ghost"}
        size="icon"
        onClick={toggleDot}
        tooltip={`Dot (${hotkey("toggle-dot")})`}
        actionId="toggle-dot"
        className="text-base"
      >
        {"\u2022"}{inputState.duration.dots > 0 ? inputState.duration.dots : ""}
      </TooltipButton>
    </div>
  );
}

function AccidentalPanel() {
  const inputState = useEditorStore((s) => s.inputState);
  const setAccidental = useEditorStore((s) => s.setAccidental);
  const hotkey = useHotkey();

  return (
    <div className="flex items-center gap-1">
      {ACCIDENTALS.map((a) => (
        <TooltipButton
          key={a.acc}
          variant={inputState.accidental === a.acc && a.acc !== "natural" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setAccidental(a.acc)}
          tooltip={hotkey(`accidental:${a.acc}`) ? `${a.acc} (${hotkey(`accidental:${a.acc}`)})` : a.acc}
          actionId={`accidental:${a.acc}`}
          className="text-base"
        >
          {a.label}
        </TooltipButton>
      ))}
    </div>
  );
}

/** Register core editor commands and panels. Not a plugin — always active. */
export function registerCoreEditor(pm: PluginManager): void {
  pm.registerCorePanel("score-editor.modes", { title: "Modes", location: "toolbar", component: () => <ModesPanel />, defaultEnabled: true });
  pm.registerCorePanel("score-editor.duration", { title: "Duration", location: "toolbar", component: () => <DurationPanel />, defaultEnabled: true });
  pm.registerCorePanel("score-editor.accidentals", { title: "Accidentals", location: "toolbar", component: () => <AccidentalPanel />, defaultEnabled: true });

  pm.registerCoreCommand("nubium.file-history", "File History", () => {
    import("../../components/HistoryModal").then((m) => m.showHistoryModal());
  });

  pm.registerCoreCommand("nubium.go-to-measure", "Go to measure...", () => {
    const store = useEditorStore.getState();
    store.setPopover(store.popover === "go-to-measure" ? null : "go-to-measure");
  });

  // Articulations
  const articulations = [
    "staccato", "accent", "tenuto", "fermata", "marcato",
    "trill", "mordent", "turn", "up-bow", "down-bow",
  ] as const;
  for (const art of articulations) {
    pm.registerCoreCommand(`notation.articulation-${art}`, `Toggle ${art}`, () => {
      useEditorStore.getState().toggleArticulation(art);
    });
  }

  // Clef changes
  const clefs = ["treble", "bass", "alto", "tenor"] as const;
  for (const clef of clefs) {
    pm.registerCoreCommand(`notation.clef-${clef}`, `Change clef to ${clef}`, () => {
      useEditorStore.getState().changeClef({ type: clef });
    });
  }

  // Views
  pm.registerCoreCommand("nubium.view-full-score", "View: Full Score", () => {
    useEditorStore.getState().setViewMode("full-score");
  });
  pm.registerCoreCommand("nubium.view-tab", "View: Tab", () => {
    useEditorStore.getState().setViewMode("tab");
  });

  // Pickup measure
  pm.registerCoreCommand("nubium.toggle-pickup", "Toggle pickup measure", () => {
    useEditorStore.getState().togglePickup();
  });

  // Editing
  pm.registerCoreCommand("nubium.insert-rest", "Insert rest", () => {
    useEditorStore.getState().insertRest();
  });
  pm.registerCoreCommand("nubium.delete", "Delete note", () => {
    useEditorStore.getState().deleteNote();
  });
  pm.registerCoreCommand("nubium.insert-measure", "Insert measure", () => {
    useEditorStore.getState().insertMeasure();
  });
  pm.registerCoreCommand("nubium.delete-measure", "Delete measure", () => {
    useEditorStore.getState().deleteMeasure();
  });
  pm.registerCoreCommand("nubium.undo", "Undo", () => {
    useEditorStore.getState().undo();
  });
  pm.registerCoreCommand("nubium.redo", "Redo", () => {
    useEditorStore.getState().redo();
  });

  // Annotation modes
  pm.registerCoreCommand("nubium.chord-mode", "Enter chord input", () => {
    useEditorStore.getState().enterChordMode();
  });
  pm.registerCoreCommand("nubium.toggle-slur", "Toggle slur", () => {
    useEditorStore.getState().toggleSlur();
  });
  pm.registerCoreCommand("nubium.toggle-step-entry", "Toggle step entry", () => {
    useEditorStore.getState().toggleStepEntry();
  });
  pm.registerCoreCommand("nubium.toggle-grace-note", "Toggle grace note mode", () => {
    useEditorStore.getState().toggleGraceNoteMode();
  });

  // Popovers
  pm.registerCoreCommand("nubium.dynamics", "Dynamics...", () => {
    useEditorStore.getState().setPopover("dynamics");
  });
  pm.registerCoreCommand("nubium.tempo", "Tempo...", () => {
    useEditorStore.getState().setPopover("tempo");
  });
  pm.registerCoreCommand("nubium.time-signature", "Time signature...", () => {
    useEditorStore.getState().setPopover("time-sig");
  });
  pm.registerCoreCommand("nubium.key-signature", "Key signature...", () => {
    useEditorStore.getState().setPopover("key-sig");
  });
  pm.registerCoreCommand("nubium.rehearsal-mark", "Rehearsal mark...", () => {
    useEditorStore.getState().setPopover("rehearsal");
  });
  pm.registerCoreCommand("nubium.barline", "Barline...", () => {
    useEditorStore.getState().setPopover("barline");
  });
  pm.registerCoreCommand("nubium.toggle-metronome", "Toggle metronome", () => {
    useEditorStore.getState().toggleMetronome();
  });
  pm.registerCoreCommand("nubium.swing-straight", "Swing: Straight", () => {
    useEditorStore.getState().setSwing({ style: "straight" });
  });
  pm.registerCoreCommand("nubium.swing-swing", "Swing: Triplet swing", () => {
    useEditorStore.getState().setSwing({ style: "swing", ratio: 2 });
  });
  pm.registerCoreCommand("nubium.swing-hard", "Swing: Hard swing", () => {
    useEditorStore.getState().setSwing({ style: "swing", ratio: 3 });
  });
  pm.registerCoreCommand("nubium.swing-shuffle", "Swing: Shuffle", () => {
    useEditorStore.getState().setSwing({ style: "shuffle", ratio: 3, backbeatAccent: 25 });
  });

  pm.registerCoreCommand("nubium.export-musicxml", "Export as MusicXML", () => {
    const score = useEditorStore.getState().score;
    const content = exportToMusicXML(score);
    const blob = new Blob([content], { type: "application/vnd.recordare.musicxml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.title || "Untitled"}.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
