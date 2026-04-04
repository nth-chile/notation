import type { Command, EditorSnapshot } from "./Command";
import type { Pitch, Octave } from "../model";
import { stepUp, stepDown, pitchToMidi, midiToPitch } from "../model/pitch";

export type NudgeMode = "diatonic" | "chromatic" | "octave";

export class NudgePitch implements Command {
  description = "Nudge pitch";

  constructor(
    private direction: "up" | "down",
    private mode: NudgeMode,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event) return state;

    const nudge = (pitch: Pitch): Pitch => {
      if (this.mode === "diatonic") {
        return this.direction === "up" ? stepUp(pitch) : stepDown(pitch);
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
      for (const head of event.heads) {
        head.pitch = nudge(head.pitch);
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
