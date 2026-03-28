import type { Command, EditorSnapshot } from "./Command";
import type { Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";

export class InsertRest implements Command {
  description = "Insert rest";

  constructor(private duration: Duration) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    voice.events.splice(eventIndex, 0, {
      kind: "rest",
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
    });

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
