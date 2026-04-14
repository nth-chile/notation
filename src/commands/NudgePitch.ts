import type { Command, EditorSnapshot } from "./Command";
import type { Pitch, Octave } from "../model";
import { stepUp, stepDown, pitchToMidi, midiToPitch, keyAccidental } from "../model/pitch";

export type NudgeMode = "diatonic" | "chromatic" | "octave";

export class NudgePitch implements Command {
  description = "Nudge pitch";

  constructor(
    private direction: "up" | "down",
    private mode: NudgeMode,
    private headIndex?: number | null,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    const voice = measure?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event) return state;

    const fifths = measure.keySignature.fifths;

    const nudge = (pitch: Pitch): Pitch => {
      if (this.mode === "diatonic") {
        const stepped = this.direction === "up" ? stepUp(pitch) : stepDown(pitch);
        // Apply key signature: a diatonic step should land on the note implied
        // by the key, not a forced natural. E.g. D→E in B♭ major should be E♭.
        return { ...stepped, accidental: keyAccidental(stepped.pitchClass, fifths) };
      }
      if (this.mode === "chromatic") {
        const midi = pitchToMidi(pitch);
        const newMidi = this.direction === "up" ? midi + 1 : midi - 1;
        if (newMidi < 0 || newMidi > 127) return pitch;
        return midiToPitch(newMidi);
      }
      // octave
      const newOctave = pitch.octave + (this.direction === "up" ? 1 : -1);
      if (newOctave < 0 || newOctave > 9) return pitch;
      return { ...pitch, octave: newOctave as Octave };
    };

    if (event.kind === "note") {
      event.head.pitch = nudge(event.head.pitch);
    } else if (event.kind === "chord") {
      if (this.headIndex != null && this.headIndex >= 0 && this.headIndex < event.heads.length) {
        event.heads[this.headIndex].pitch = nudge(event.heads[this.headIndex].pitch);
      } else {
        for (const head of event.heads) {
          head.pitch = nudge(head.pitch);
        }
      }
    } else if (event.kind === "grace") {
      event.head.pitch = nudge(event.head.pitch);
    }
    // rests/slashes: nothing to nudge

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
