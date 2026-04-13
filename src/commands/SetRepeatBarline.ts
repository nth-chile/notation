import type { Command, EditorSnapshot } from "./Command";
import type { BarlineType } from "../model/time";

export class SetRepeatBarline implements Command {
  description = "Set repeat barline";

  constructor(private barlineType: BarlineType) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { measureIndex, partIndex } = input.cursor;

    // Determine the new barline from the cursor's part, then apply uniformly.
    // Using the cursor's part as the reference keeps all parts in sync even
    // when they started desynced (e.g. from MusicXML import).
    const refMeasure = score.parts[partIndex]?.measures[measureIndex];
    if (!refMeasure) return state;
    const newBarline =
      refMeasure.barlineEnd === this.barlineType ? "single" : this.barlineType;

    for (const part of score.parts) {
      const measure = part.measures[measureIndex];
      if (!measure) continue;
      measure.barlineEnd = newBarline;
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
