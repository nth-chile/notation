import type { Command, EditorSnapshot } from "./Command";
import type { KeySignature } from "../model";

export class ChangeKeySig implements Command {
  description = "Change key signature";

  constructor(private keySignature: KeySignature) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { measureIndex } = input.cursor;

    // Key signature changes apply to all parts at this measure
    for (const part of score.parts) {
      const measure = part.measures[measureIndex];
      if (measure) {
        measure.keySignature = { ...this.keySignature };
      }
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
