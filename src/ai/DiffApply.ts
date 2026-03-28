import type { Score, Measure } from "../model";
import { newId, type PartId, type MeasureId, type VoiceId } from "../model/ids";
import { parseMeasure, jsonToScore } from "../serialization";

export interface ApplyResult {
  ok: true;
  score: Score;
}

export interface ApplyError {
  ok: false;
  error: string;
}

/**
 * Applies a patch-based AI edit to the current score.
 * Supports: { patch: [...] }, { score: {...}, patch: [...] }, { addParts: [...] }
 * Falls back to full-score replacement if the response looks like a complete score.
 */
export function applyAIEdit(
  currentScore: Score,
  responseText: string
): ApplyResult | ApplyError {
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>;

    // Detect patch format
    if (Array.isArray(parsed.patch)) {
      const score = structuredClone(currentScore);

      // Apply score-level changes
      if (parsed.score && typeof parsed.score === "object") {
        const s = parsed.score as Record<string, unknown>;
        if (s.title !== undefined) score.title = s.title as string;
        if (s.composer !== undefined) score.composer = s.composer as string;
        if (s.tempo !== undefined) score.tempo = s.tempo as number;
      }

      // Apply measure patches
      for (const entry of parsed.patch as Record<string, unknown>[]) {
        const partIdx = (entry.part as number) ?? 0;
        const measureNum = (entry.measure as number) ?? 1;
        const measureIdx = measureNum - 1;
        const data = entry.data as Record<string, unknown>;

        if (!data || !score.parts[partIdx]) continue;

        const part = score.parts[partIdx];

        // Extend measures array if needed
        while (part.measures.length <= measureIdx) {
          part.measures.push({
            id: newId<MeasureId>("msr"),
            clef: { type: "treble" },
            timeSignature: { numerator: 4, denominator: 4 },
            keySignature: { fifths: 0 },
            barlineEnd: "single",
            annotations: [],
            voices: [{ id: newId<VoiceId>("vce"), events: [] }],
          });
        }

        // Replace the measure, preserving the ID
        const oldId = part.measures[measureIdx].id;
        part.measures[measureIdx] = parseMeasure(data);
        part.measures[measureIdx].id = oldId;
      }

      // Add new parts
      if (Array.isArray(parsed.addParts)) {
        for (const p of parsed.addParts as Record<string, unknown>[]) {
          const measures: Measure[] = [];
          if (Array.isArray(p.measures)) {
            for (const m of p.measures as Record<string, unknown>[]) {
              measures.push(parseMeasure(m));
            }
          }
          // Pad to match existing part length
          const targetLen = score.parts[0]?.measures.length ?? 32;
          while (measures.length < targetLen) {
            measures.push({
              id: newId<MeasureId>("msr"),
              clef: { type: "treble" },
              timeSignature: { numerator: 4, denominator: 4 },
              keySignature: { fifths: 0 },
              barlineEnd: "single",
              annotations: [],
              voices: [{ id: newId<VoiceId>("vce"), events: [] }],
            });
          }
          score.parts.push({
            id: newId<PartId>("prt"),
            name: (p.name as string) || "New Part",
            abbreviation: ((p.name as string) || "NP").slice(0, 3),
            instrumentId: (p.instrument as string) || "piano",
            muted: false,
            solo: false,
            measures,
          });
        }
      }

      return { ok: true, score };
    }

    // Fallback: treat as a complete score replacement
    const newScore = jsonToScore(parsed);
    newScore.id = currentScore.id;
    return { ok: true, score: newScore };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parse error";
    return {
      ok: false,
      error: `Failed to parse AI output: ${message}`,
    };
  }
}
