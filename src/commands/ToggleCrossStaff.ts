import type { Command, EditorSnapshot } from "./Command";
import { getInstrument } from "../model/instruments";
import { isCrossStaff } from "../model/note";

export class ToggleCrossStaff implements Command {
  description = "Toggle cross-staff";

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const part = score.parts[partIndex];
    if (!part) return state;

    const instrument = getInstrument(part.instrumentId);
    if (!instrument || instrument.staves < 2) return state;

    const voice = part.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event || event.kind === "rest" || event.kind === "slash") return state;

    const voiceStaff = voice.staff ?? 0;
    const otherStaff = voiceStaff === 0 ? 1 : 0;

    if (isCrossStaff(event, voiceStaff)) {
      // Toggle off: clear renderStaff
      delete event.renderStaff;
    } else {
      // Toggle on: render on the other staff
      event.renderStaff = otherStaff;
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
