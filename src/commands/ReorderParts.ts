import type { Command, EditorSnapshot } from "./Command";

export class ReorderParts implements Command {
  description = "Reorder parts";

  constructor(
    private partIndex: number,
    private direction: "up" | "down"
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);

    const targetIndex =
      this.direction === "up" ? this.partIndex - 1 : this.partIndex + 1;

    if (targetIndex < 0 || targetIndex >= score.parts.length) {
      return { score, inputState: input };
    }

    // Swap
    const temp = score.parts[this.partIndex];
    score.parts[this.partIndex] = score.parts[targetIndex];
    score.parts[targetIndex] = temp;

    // Update cursor if it was on the moved part
    if (input.cursor.partIndex === this.partIndex) {
      input.cursor.partIndex = targetIndex;
    } else if (input.cursor.partIndex === targetIndex) {
      input.cursor.partIndex = this.partIndex;
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
