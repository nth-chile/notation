import type { Command, EditorSnapshot } from "./Command";

export class ToggleDot implements Command {
  description = "Toggle dot";

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event) return state;

    const newDots = ((event.duration.dots + 1) % 4) as 0 | 1 | 2 | 3;
    event.duration = { ...event.duration, dots: newDots };

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
