import type { Command, EditorSnapshot } from "./Command";
import { newId, type PartId, type MeasureId, type VoiceId } from "../model/ids";
import type { Measure } from "../model";
import { getInstrument } from "../model/instruments";

export class AddPart implements Command {
  description = "Add part";

  constructor(private instrumentId: string) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);

    const instrument = getInstrument(this.instrumentId);
    const name = instrument?.name ?? "New Part";
    const abbreviation = instrument?.abbreviation ?? "N.P.";
    const clefType = instrument?.clef ?? "treble";

    // Match the number of measures from the first existing part
    const measureCount = score.parts.length > 0 ? score.parts[0].measures.length : 32;

    const measures: Measure[] = [];
    for (let i = 0; i < measureCount; i++) {
      // Copy time signature and key signature from the corresponding measure in the first part
      const refMeasure = score.parts[0]?.measures[i];
      measures.push({
        id: newId<MeasureId>("msr"),
        clef: { type: clefType },
        timeSignature: refMeasure
          ? { ...refMeasure.timeSignature }
          : { numerator: 4, denominator: 4 },
        keySignature: refMeasure
          ? { ...refMeasure.keySignature }
          : { fifths: 0 },
        barlineEnd: "single",
        annotations: [],
        voices: [{ id: newId<VoiceId>("vce"), events: [] }],
      });
    }

    score.parts.push({
      id: newId<PartId>("prt"),
      name,
      abbreviation,
      instrumentId: this.instrumentId,
      muted: false,
      solo: false,
      measures,
    });

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
