import { HelpCircle } from "lucide-react";
import { useEditorStore } from "../state";
import type { Score } from "../model";

function isScoreEmpty(score: Score): boolean {
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const voice of measure.voices) {
        for (const ev of voice.events) {
          if (ev.kind === "note" || ev.kind === "chord" || ev.kind === "slash" || ev.kind === "grace") {
            return false;
          }
        }
      }
    }
  }
  return true;
}

export function EmptyScoreHint() {
  const score = useEditorStore((s) => s.score);
  if (!isScoreEmpty(score)) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card/95 backdrop-blur px-4 py-2 shadow-md"
      role="status"
    >
      <span className="text-sm text-muted-foreground">New here? Click the</span>
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">icon above for tips on getting started.</span>
    </div>
  );
}
