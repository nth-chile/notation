import type { Command, EditorSnapshot } from "./Command";
import type { Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";
import { resolveVoiceForStaff } from "./measureUtils";

/**
 * Overwrites the event at the cursor with a rest (non-insert step entry).
 * If cursor is past the end, appends instead. Mirror of OverwriteNote.
 */
export class OverwriteRest implements Command {
  description = "Overwrite rest (step entry)";

  constructor(private duration: Duration) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    const staveIndex = input.cursor.staveIndex ?? 0;
    const voiceIndex = resolveVoiceForStaff(measure, input.cursor.voiceIndex, staveIndex);
    input.cursor.voiceIndex = voiceIndex;
    const voice = measure.voices[voiceIndex];
    if (!voice) return state;

    const newEvent = {
      kind: "rest" as const,
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
    };

    if (eventIndex < voice.events.length) {
      voice.events[eventIndex] = newEvent;
    } else {
      voice.events.push(newEvent);
    }

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
