import type { Command, EditorSnapshot } from "./Command";
import type { Volta } from "../model/navigation";

export class SetVolta implements Command {
  description = "Set volta bracket";

  constructor(private volta: Volta | null) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { measureIndex } = input.cursor;

    // Apply volta across all parts at this measure index
    for (const part of score.parts) {
      const measure = part.measures[measureIndex];
      if (!measure) continue;

      if (this.volta === null) {
        // Remove volta
        if (measure.navigation) {
          delete measure.navigation.volta;
          if (Object.keys(measure.navigation).length === 0) {
            delete measure.navigation;
          }
        }
      } else {
        if (!measure.navigation) measure.navigation = {};
        measure.navigation.volta = { ...this.volta };
      }
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
