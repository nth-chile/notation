import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { getBindingParts, getSettings } from "../settings";
import { openExternal } from "../utils/openExternal";

interface CheatSheetProps {
  visible: boolean;
  onClose: () => void;
}

const HELP_BASE = "https://nubium.rocks/help";

interface Topic {
  title: string;
  blurb: string;
  anchor: string;
}

const TOPICS: Topic[] = [
  { title: "Repeats & navigation", blurb: "Voltas, codas, D.S./D.C., segno", anchor: "repeats" },
  { title: "Measures & barlines", blurb: "Pickups and barline types", anchor: "measures" },
  { title: "Guitar & tab", blurb: "Tunings, frets, techniques", anchor: "guitar" },
  { title: "Plugins & AI Chat", blurb: "Toggle, install, extend", anchor: "plugins" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-7 px-1.5 rounded-md border border-border bg-muted font-mono text-[12px] font-medium text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
      {children}
    </kbd>
  );
}

function ActionKbd({ actionId }: { actionId: string }) {
  const binding = getSettings().keyBindings[actionId];
  if (!binding) return null;
  const parts = getBindingParts(binding);
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p, i) => <Kbd key={i}>{p}</Kbd>)}
    </span>
  );
}

/** A keyboard chip followed by a short label. Wraps as one unit. */
function Shortcut({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {keys}
      <span>{label}</span>
    </span>
  );
}

function NoteEntrySection() {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold tracking-tight mb-1.5 text-foreground">Entering notes</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>Press</span> <ActionKbd actionId="toggle-note-entry" /> <span>to toggle note entry mode. Then</span>
        <Kbd>A</Kbd>–<Kbd>G</Kbd> <span>writes a note,</span>
        <ActionKbd actionId="insert-rest" /> <span>inserts a rest,</span>
        <Kbd>1</Kbd>–<Kbd>7</Kbd> <span>sets the duration.</span>
      </p>
    </section>
  );
}

function AnnotationsSection() {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold tracking-tight mb-1 text-foreground">Annotations & marks</h3>
      <p className="text-xs text-muted-foreground/80 italic mb-2 leading-snug flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <span>In note entry mode, letters write notes — press</span>
        <ActionKbd actionId="toggle-note-entry" />
        <span>or</span>
        <ActionKbd actionId="escape" />
        <span>to exit and use these shortcuts.</span>
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed flex flex-wrap items-center gap-x-6 gap-y-2.5">
        <Shortcut keys={<ActionKbd actionId="chord-mode" />} label="chord symbol" />
        <Shortcut keys={<ActionKbd actionId="lyric-mode" />} label="lyric" />
        <Shortcut keys={<ActionKbd actionId="dynamics-popover" />} label="dynamics" />
        <Shortcut keys={<ActionKbd actionId="barline-popover" />} label="barline" />
        <Shortcut keys={<ActionKbd actionId="rehearsal-popover" />} label="rehearsal mark" />
        <Shortcut keys={<ActionKbd actionId="navigation-popover" />} label="repeats / codas" />
        <Shortcut keys={<ActionKbd actionId="time-sig-popover" />} label="time signature" />
        <Shortcut keys={<ActionKbd actionId="key-sig-popover" />} label="key signature" />
        <Shortcut keys={<ActionKbd actionId="tempo-popover" />} label="tempo" />
        <Shortcut keys={<ActionKbd actionId="toggle-tie" />} label="tie" />
        <Shortcut keys={<ActionKbd actionId="toggle-slur" />} label="slur" />
      </p>
    </section>
  );
}

function ArticulationsSection() {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold tracking-tight mb-1.5 text-foreground">Articulations & dynamics</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex flex-wrap items-center gap-x-6 gap-y-2.5">
        <Shortcut keys={<ActionKbd actionId="articulation:accent" />} label="accent" />
        <Shortcut keys={<ActionKbd actionId="articulation:staccato" />} label="staccato" />
        <Shortcut keys={<ActionKbd actionId="articulation:tenuto" />} label="tenuto" />
        <Shortcut keys={<ActionKbd actionId="articulation:marcato" />} label="marcato" />
        <Shortcut keys={<ActionKbd actionId="articulation:fermata" />} label="fermata" />
        <Shortcut keys={<ActionKbd actionId="articulation:trill" />} label="trill" />
        <Shortcut keys={<ActionKbd actionId="hairpin:crescendo" />} label="crescendo" />
        <Shortcut keys={<ActionKbd actionId="hairpin:diminuendo" />} label="diminuendo" />
      </p>
    </section>
  );
}

function TopicGrid() {
  return (
    <section className="mt-2">
      <h3 className="text-sm font-semibold tracking-tight mb-2 text-foreground">Learn more</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.anchor}
            onClick={() => openExternal(`${HELP_BASE}#${t.anchor}`)}
            className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:bg-muted/60 px-4 py-3 text-left transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.blurb}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function CheatSheet({ visible, onClose }: CheatSheetProps) {
  const paletteBinding = getSettings().keyBindings["command-palette"];
  const paletteParts = paletteBinding ? getBindingParts(paletteBinding) : [];

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-8">
        <DialogHeader className="mb-5">
          <DialogTitle className="text-xl">Getting started</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed">
            <span>Some common concepts and shortcuts to get you started. Look up anything else in the command palette</span>
            <span className="inline-flex items-center gap-1">
              {paletteParts.map((p, i) => <Kbd key={i}>{p}</Kbd>)}
            </span>
            <span>or</span>
            <button
              onClick={() => openExternal("https://nubium.rocks/help")}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              read the full guide
              <ExternalLink className="h-3 w-3" />
            </button>
            <span>.</span>
          </DialogDescription>
        </DialogHeader>

        <NoteEntrySection />
        <AnnotationsSection />
        <ArticulationsSection />
        <TopicGrid />
      </DialogContent>
    </Dialog>
  );
}
