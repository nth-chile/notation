import type { Command, EditorSnapshot } from "./Command";
import type { TimeSignature } from "../model";

export class ChangeTimeSig implements Command {
  description = "Change time signature";

  constructor(private timeSignature: TimeSignature) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { measureIndex } = input.cursor;

    // Time signature changes apply to all parts at this measure
    for (const part of score.parts) {
      const measure = part.measures[measureIndex];
      if (measure) {
        measure.timeSignature = { ...this.timeSignature };
      }
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
