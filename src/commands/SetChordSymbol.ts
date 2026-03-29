import type { Command, EditorSnapshot } from "./Command";
import type { NoteEventId } from "../model";

export class SetChordSymbol implements Command {
  description = "Set chord symbol";

  constructor(
    private text: string,
    private beatOffset: number,
    private noteEventId: NoteEventId
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    // Remove existing chord at this beat offset
    measure.annotations = measure.annotations.filter(
      (a) => !(a.kind === "chord-symbol" && a.beatOffset === this.beatOffset)
    );

    if (this.text.trim()) {
      measure.annotations.push({
        kind: "chord-symbol",
        text: this.text.trim(),
        beatOffset: this.beatOffset,
        noteEventId: this.noteEventId,
      });
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
