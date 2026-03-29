import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import { useEditorStore } from "../../state";
import type { DurationType, Accidental } from "../../model";
import { Separator } from "@/components/ui/separator";
import { TooltipButton } from "@/components/ui/tooltip-button";

const DURATIONS: { type: DurationType; label: string; key: string }[] = [
  { type: "whole", label: "W", key: "1" },
  { type: "half", label: "H", key: "2" },
  { type: "quarter", label: "Q", key: "3" },
  { type: "eighth", label: "8", key: "4" },
  { type: "16th", label: "16", key: "5" },
  { type: "32nd", label: "32", key: "6" },
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

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-secondary/50 shrink-0">
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider mr-1">Duration</span>
        {DURATIONS.map((d) => (
          <TooltipButton
            key={d.type}
            variant={inputState.duration.type === d.type ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDuration(d.type)}
            tooltip={`${d.type} (${d.key})`}
            className="text-base"
          >
            {d.label}
          </TooltipButton>
        ))}
        <TooltipButton
          variant={inputState.duration.dots > 0 ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleDot}
          tooltip="Dot (.)"
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
            tooltip={a.acc}
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
    </div>
  );
}

export const ScoreEditorPlugin: NotationPlugin = {
  id: "notation.score-editor",
  name: "Score Editor",
  version: "1.0.0",
  description: "Duration, accidental, octave, and dot note input controls",
  activate(api: PluginAPI) {
    api.registerPanel("score-editor.note-input", { title: "Note Input", location: "toolbar", component: () => <NoteInputPanel />, defaultEnabled: true });

    api.registerCommand("notation.file-history", "File History", () => {
      import("../../components/HistoryModal").then((m) => m.showHistoryModal());
    });
  },
};
