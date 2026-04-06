import type { Command, EditorSnapshot } from "./Command";
import type { Duration } from "../model";
import type { Tuning } from "../model/guitar";
import { STANDARD_TUNING } from "../model/guitar";
import { midiToPitch } from "../model/pitch";
import { newId, type NoteEventId } from "../model/ids";

/**
 * Insert or overwrite a note from tab input (fret + string).
 * Converts fret/string/tuning to a pitch and stores explicit tabInfo.
 */
export class InsertTabNote implements Command {
  description = "Insert tab note";

  constructor(
    private fret: number,
    private string: number, // 1-6 (1 = high E)
    private duration: Duration,
    private tuning: Tuning = STANDARD_TUNING,
    private capo: number = 0,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    const voice = measure?.voices[voiceIndex];
    if (!voice || !measure) return state;

    // Convert fret + string + tuning to MIDI → pitch
    // tuning.strings is indexed low-to-high: [0]=string6, ..., [5]=string1
    const stringIdx = this.tuning.strings.length - this.string;
    const openMidi = this.tuning.strings[stringIdx];
    if (openMidi === undefined) return state;
    const midi = openMidi + this.fret + this.capo;
    const pitch = midiToPitch(midi);

    const newEvent = {
      kind: "note" as const,
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
      head: {
        pitch,
        tabInfo: { string: this.string, fret: this.fret },
      },
      tabInfo: { string: this.string, fret: this.fret },
    };

    if (eventIndex < voice.events.length) {
      voice.events[eventIndex] = newEvent;
    } else {
      voice.events.push(newEvent);
    }

    input.cursor.eventIndex = eventIndex + 1;
    // Clear fret buffer after insertion
    input.tabFretBuffer = "";
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
