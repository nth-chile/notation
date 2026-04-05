import type { Score, Measure } from "../model";
import { newId, type MeasureId, type VoiceId } from "../model/ids";

/**
 * Append a new empty measure to every part in the score,
 * copying time/key/clef from each part's last measure.
 */
export function appendMeasureToAllParts(score: Score): void {
  for (const part of score.parts) {
    const last = part.measures[part.measures.length - 1];
    if (!last) continue;
    const newMeasure: Measure = {
      id: newId<MeasureId>("msr"),
      clef: { ...last.clef },
      timeSignature: { ...last.timeSignature },
      keySignature: { ...last.keySignature },
      barlineEnd: "single",
      annotations: [],
      voices: last.voices.map((v) => ({
        id: newId<VoiceId>("vce"),
        events: [],
        staff: v.staff,
      })),
    };
    part.measures.push(newMeasure);
  }
}
