import type { Command, EditorSnapshot } from "./Command";

export class DeleteNote implements Command {
  description = "Delete note";

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice || eventIndex <= 0) return state;

    voice.events.splice(eventIndex - 1, 1);
    input.cursor.eventIndex = Math.max(0, eventIndex - 1);
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
