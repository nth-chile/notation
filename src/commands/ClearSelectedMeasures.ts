import type { Command, EditorSnapshot } from "./Command";
import type { Selection } from "../plugins/PluginAPI";
import { factory } from "../model";

/**
 * Clear the note content of the measures in the selection, replacing each
 * voice with a single whole rest. Measure structure and other parts are
 * untouched — this is what plain Backspace on a measure range should do.
 * Structural measure removal lives in DeleteSelectedMeasures (used by Cut).
 */
export class ClearSelectedMeasures implements Command {
  description = "Clear selected measures";

  constructor(private selection: Selection) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureStart, measureEnd } = this.selection;

    const part = score.parts[partIndex];
    if (!part) return state;

    for (let m = measureStart; m <= measureEnd; m++) {
      const measure = part.measures[m];
      if (!measure) continue;
      // Remove note-anchored annotations (chord symbols, lyrics, dynamics,
      // hairpins, slurs) since all events are being cleared.
      measure.annotations = measure.annotations.filter((a) => {
        switch (a.kind) {
          case "chord-symbol":
          case "lyric":
          case "dynamic":
          case "hairpin":
          case "slur":
            return false;
          default:
            return true;
        }
      });
      for (const voice of measure.voices) {
        voice.events = [factory.rest({ type: "whole", dots: 0 })];
      }
    }

    input.cursor.measureIndex = measureStart;
    input.cursor.eventIndex = 0;

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
