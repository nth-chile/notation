import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental, NoteHead } from "../model";

/**
 * Adds a pitch to an existing note/chord at the given eventIndex, turning a
 * Note into a Chord (or appending a head to an existing Chord). No-op on
 * rests, slashes, grace notes, or missing events.
 */
export class AddPitchToChord implements Command {
  description = "Add pitch to chord";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private targetEventIndex: number,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[this.targetEventIndex];
    if (!event) return state;

    const newHead: NoteHead = {
      pitch: {
        pitchClass: this.pitchClass,
        accidental: this.accidental,
        octave: this.octave,
      },
    };

    if (event.kind === "note") {
      const chord = {
        kind: "chord" as const,
        id: event.id,
        duration: event.duration,
        heads: [event.head, newHead],
        stemDirection: event.stemDirection,
        tabInfo: event.tabInfo,
        articulations: event.articulations,
        tuplet: event.tuplet,
        renderStaff: event.renderStaff,
      };
      voice.events[this.targetEventIndex] = chord;
    } else if (event.kind === "chord") {
      const duplicate = event.heads.some(
        (h) =>
          h.pitch.pitchClass === this.pitchClass &&
          h.pitch.octave === this.octave &&
          h.pitch.accidental === this.accidental,
      );
      if (!duplicate) {
        event.heads.push(newHead);
      }
    } else {
      return state;
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
