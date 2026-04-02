import type { Command, EditorSnapshot } from "./Command";
import type { Accidental } from "../model";

export class SetAccidental implements Command {
  description = "Set accidental";

  constructor(private accidental: Accidental) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const evt = voice.events[eventIndex];
    if (!evt) return state;

    if (evt.kind === "note" || evt.kind === "grace") {
      evt.head = { ...evt.head, pitch: { ...evt.head.pitch, accidental: this.accidental } };
    } else if (evt.kind === "chord") {
      evt.heads = evt.heads.map((h) => ({
        ...h,
        pitch: { ...h.pitch, accidental: this.accidental },
      }));
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
