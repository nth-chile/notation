import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental } from "../model";
import { newId, type NoteEventId } from "../model/ids";

/**
 * Inserts a grace note before the event at cursor.
 * Grace notes take zero duration in the measure.
 */
export class InsertGraceNote implements Command {
  description = "Insert grace note";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private slash: boolean = true,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    voice.events.splice(eventIndex, 0, {
      kind: "grace",
      id: newId<NoteEventId>("evt"),
      duration: { type: "eighth", dots: 0 },
      head: {
        pitch: {
          pitchClass: this.pitchClass,
          accidental: this.accidental,
          octave: this.octave,
        },
      },
      slash: this.slash,
    });

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
