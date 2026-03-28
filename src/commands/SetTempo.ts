import type { Command, EditorSnapshot } from "./Command";
import type { DurationType } from "../model";

export class SetTempo implements Command {
  description = "Set tempo marking";

  constructor(
    private bpm: number,
    private beatUnit: DurationType = "quarter",
    private text?: string
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    // Remove existing tempo mark
    measure.annotations = measure.annotations.filter(
      (a) => a.kind !== "tempo-mark"
    );

    measure.annotations.push({
      kind: "tempo-mark",
      bpm: this.bpm,
      beatUnit: this.beatUnit,
      text: this.text,
    });

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
