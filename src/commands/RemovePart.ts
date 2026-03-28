import type { Command, EditorSnapshot } from "./Command";

export class RemovePart implements Command {
  description = "Remove part";

  constructor(private partIndex: number) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);

    // Can't remove the last part
    if (score.parts.length <= 1) return { score, inputState: input };

    // Validate index
    if (this.partIndex < 0 || this.partIndex >= score.parts.length) {
      return { score, inputState: input };
    }

    score.parts.splice(this.partIndex, 1);

    // Adjust cursor if it was on or beyond the removed part
    if (input.cursor.partIndex >= score.parts.length) {
      input.cursor.partIndex = score.parts.length - 1;
      input.cursor.eventIndex = 0;
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
