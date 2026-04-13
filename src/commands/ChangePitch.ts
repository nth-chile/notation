import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental } from "../model";

export class ChangePitch implements Command {
  description = "Change pitch";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private headIndex?: number | null,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event) return state;

    const newPitch = {
      pitchClass: this.pitchClass,
      accidental: this.accidental,
      octave: this.octave,
    };

    if (event.kind === "note") {
      event.head.pitch = newPitch;
    } else if (event.kind === "chord" && event.heads.length > 0) {
      const targetIdx =
        this.headIndex != null && this.headIndex >= 0 && this.headIndex < event.heads.length
          ? this.headIndex
          : 0;
      event.heads[targetIdx].pitch = newPitch;
    }
    // rests: no pitch to change

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
