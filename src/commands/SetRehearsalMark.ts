import type { Command, EditorSnapshot } from "./Command";

export class SetRehearsalMark implements Command {
  description = "Set rehearsal mark";

  constructor(private text: string) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    // Remove existing rehearsal mark
    measure.annotations = measure.annotations.filter(
      (a) => a.kind !== "rehearsal-mark"
    );

    if (this.text.trim()) {
      measure.annotations.push({
        kind: "rehearsal-mark",
        text: this.text.trim(),
      });
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
