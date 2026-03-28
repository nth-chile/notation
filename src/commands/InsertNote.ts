import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental, Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";

export class InsertNote implements Command {
  description = "Insert note";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private duration: Duration
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    voice.events.splice(eventIndex, 0, {
      kind: "note",
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
      head: {
        pitch: {
          pitchClass: this.pitchClass,
          accidental: this.accidental,
          octave: this.octave,
        },
      },
    });

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    // Handled by CommandHistory's snapshot-based undo
    return state;
  }
}
