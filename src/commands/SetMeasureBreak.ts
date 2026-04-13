import type { Command, EditorSnapshot } from "./Command";
import type { MeasureBreak } from "../model";

/** Set (or clear) the break attached to the end of the measure at the cursor.
 *  Pass `null` to clear an existing break. */
export class SetMeasureBreak implements Command {
  description = "Set measure break";

  constructor(private breakType: MeasureBreak | null) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { measureIndex } = input.cursor;

    // Breaks apply to all parts at this measure so layout stays consistent.
    for (const part of score.parts) {
      const measure = part.measures[measureIndex];
      if (!measure) continue;
      if (this.breakType == null) {
        delete measure.break;
      } else {
        measure.break = this.breakType;
      }
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
