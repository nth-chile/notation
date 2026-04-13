import type { Score, Measure } from "../model";
import { newId, type MeasureId, type VoiceId } from "../model/ids";

/**
 * Return a voice index in `measure.voices` that belongs to the given staff.
 * Prefers the current `voiceIndex` if it already points to a voice on that
 * staff; otherwise finds an existing matching voice, or appends a new one.
 */
export function resolveVoiceForStaff(
  measure: Measure,
  voiceIndex: number,
  staveIndex: number,
): number {
  const current = measure.voices[voiceIndex];
  if (current && (current.staff ?? 0) === staveIndex) return voiceIndex;
  const existing = measure.voices.findIndex((v) => (v.staff ?? 0) === staveIndex);
  if (existing >= 0) return existing;
  const newIdx = measure.voices.length;
  measure.voices.push({
    id: newId<VoiceId>("vce"),
    events: [],
    staff: staveIndex,
  });
  return newIdx;
}

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
