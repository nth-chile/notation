import type { Command, EditorSnapshot } from "./Command";
import type { Articulation, ArticulationKind } from "../model/note";

export class ToggleArticulation implements Command {
  description = "Toggle articulation";

  constructor(private kind: ArticulationKind) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const voice = score.parts[partIndex]?.measures[measureIndex]?.voices[voiceIndex];
    if (!voice) return state;

    const event = voice.events[eventIndex];
    if (!event || event.kind === "rest" || event.kind === "slash") return state;

    const arts: Articulation[] = event.articulations ?? [];
    const idx = arts.findIndex((a) => a.kind === this.kind);

    if (idx >= 0) {
      arts.splice(idx, 1);
    } else {
      arts.push({ kind: this.kind } as Articulation);
    }

    event.articulations = arts.length > 0 ? arts : undefined;

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
