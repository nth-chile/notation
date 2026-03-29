import type { Command, EditorSnapshot } from "./Command";
import type { NoteEventId } from "../model/ids";

export class SetSlur implements Command {
  description = "Set slur";

  constructor(
    private startEventId: NoteEventId,
    private endEventId: NoteEventId,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    // Remove existing slur with same start
    measure.annotations = measure.annotations.filter(
      (a) => !(a.kind === "slur" && a.startEventId === this.startEventId),
    );

    measure.annotations.push({
      kind: "slur",
      startEventId: this.startEventId,
      endEventId: this.endEventId,
    });

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
