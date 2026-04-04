import type { PluginManager } from "../PluginManager";
import { useEditorStore } from "../../state";
import { useHotkey } from "../../hooks/useHotkey";
import { exportToMusicXML } from "../../musicxml/export";
import type { DurationType, Accidental } from "../../model";
import { Separator } from "@/components/ui/separator";
import { TooltipButton } from "@/components/ui/tooltip-button";

const DURATIONS: { type: DurationType; label: string; actionId: string }[] = [
  { type: "whole", label: "W", actionId: "duration:whole" },
  { type: "half", label: "H", actionId: "duration:half" },
  { type: "quarter", label: "Q", actionId: "duration:quarter" },
  { type: "eighth", label: "8", actionId: "duration:eighth" },
  { type: "16th", label: "16", actionId: "duration:16th" },
  { type: "32nd", label: "32", actionId: "duration:32nd" },
];

const ACCIDENTALS: { acc: Accidental; label: string }[] = [
  { acc: "flat", label: "\u266D" },
  { acc: "natural", label: "\u266E" },
  { acc: "sharp", label: "\u266F" },
];

function NoteInputPanel() {
  const inputState = useEditorStore((s) => s.inputState);
  const setDuration = useEditorStore((s) => s.setDuration);
  const toggleDot = useEditorStore((s) => s.toggleDot);
  const setAccidental = useEditorStore((s) => s.setAccidental);
  const toggleStepEntry = useEditorStore((s) => s.toggleStepEntry);
  const toggleInsertMode = useEditorStore((s) => s.toggleInsertMode);
  const toggleGraceNoteMode = useEditorStore((s) => s.toggleGraceNoteMode);
  const hotkey = useHotkey();

  return (
    <>
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
        <TooltipButton
          variant={inputState.graceNoteMode ? "default" : "ghost"}
          size="icon"
          onClick={toggleGraceNoteMode}
          tooltip={`Grace note (${hotkey("toggle-grace-note")})`}
          actionId="toggle-grace-note"
          className="text-xs font-bold italic"
        >
          G
        </TooltipButton>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider mr-1">Duration</span>
        {DURATIONS.map((d) => (
          <TooltipButton
            key={d.type}
            variant={inputState.duration.type === d.type ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDuration(d.type)}
            tooltip={`${d.type} (${hotkey(d.actionId)})`}
            actionId={d.actionId}
            className="text-base"
          >
            {d.label}
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

      <Separator orientation="vertical" />

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider mr-1">Accidental</span>
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

      <Separator orientation="vertical" />

      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider mr-1">Octave</span>
        <span className="text-sm font-semibold min-w-[20px] text-center">{inputState.octave}</span>
      </div>
    </>
  );
}

/** Register core editor commands and panels. Not a plugin — always active. */
export function registerCoreEditor(pm: PluginManager): void {
  pm.registerCorePanel("score-editor.note-input", { title: "Note Input", location: "toolbar", component: () => <NoteInputPanel />, defaultEnabled: true });

  pm.registerCoreCommand("notation.file-history", "File History", () => {
    import("../../components/HistoryModal").then((m) => m.showHistoryModal());
  });

  pm.registerCoreCommand("notation.go-to-measure", "Go to measure...", () => {
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
  pm.registerCoreCommand("notation.view-full-score", "View: Full Score", () => {
    useEditorStore.getState().setViewMode("full-score");
  });
  pm.registerCoreCommand("notation.view-tab", "View: Tab", () => {
    useEditorStore.getState().setViewMode("tab");
  });

  // Pickup measure
  pm.registerCoreCommand("notation.toggle-pickup", "Toggle pickup measure", () => {
    useEditorStore.getState().togglePickup();
  });

  // Editing
  pm.registerCoreCommand("notation.insert-rest", "Insert rest", () => {
    useEditorStore.getState().insertRest();
  });
  pm.registerCoreCommand("notation.delete", "Delete note", () => {
    useEditorStore.getState().deleteNote();
  });
  pm.registerCoreCommand("notation.insert-measure", "Insert measure", () => {
    useEditorStore.getState().insertMeasure();
  });
  pm.registerCoreCommand("notation.delete-measure", "Delete measure", () => {
    useEditorStore.getState().deleteMeasure();
  });
  pm.registerCoreCommand("notation.undo", "Undo", () => {
    useEditorStore.getState().undo();
  });
  pm.registerCoreCommand("notation.redo", "Redo", () => {
    useEditorStore.getState().redo();
  });

  // Annotation modes
  pm.registerCoreCommand("notation.chord-mode", "Enter chord input", () => {
    useEditorStore.getState().enterChordMode();
  });
  pm.registerCoreCommand("notation.toggle-slur", "Toggle slur", () => {
    useEditorStore.getState().toggleSlur();
  });
  pm.registerCoreCommand("notation.toggle-step-entry", "Toggle step entry", () => {
    useEditorStore.getState().toggleStepEntry();
  });
  pm.registerCoreCommand("notation.toggle-grace-note", "Toggle grace note mode", () => {
    useEditorStore.getState().toggleGraceNoteMode();
  });

  // Popovers
  pm.registerCoreCommand("notation.dynamics", "Dynamics...", () => {
    useEditorStore.getState().setPopover("dynamics");
  });
  pm.registerCoreCommand("notation.tempo", "Tempo...", () => {
    useEditorStore.getState().setPopover("tempo");
  });
  pm.registerCoreCommand("notation.time-signature", "Time signature...", () => {
    useEditorStore.getState().setPopover("time-sig");
  });
  pm.registerCoreCommand("notation.key-signature", "Key signature...", () => {
    useEditorStore.getState().setPopover("key-sig");
  });
  pm.registerCoreCommand("notation.rehearsal-mark", "Rehearsal mark...", () => {
    useEditorStore.getState().setPopover("rehearsal");
  });
  pm.registerCoreCommand("notation.barline", "Barline...", () => {
    useEditorStore.getState().setPopover("barline");
  });
  pm.registerCoreCommand("notation.toggle-metronome", "Toggle metronome", () => {
    useEditorStore.getState().toggleMetronome();
  });

  pm.registerCoreCommand("notation.export-musicxml", "Export as MusicXML", () => {
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
