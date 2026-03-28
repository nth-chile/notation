import type { Score } from "../model";
import { deserialize } from "../serialization";

export interface ApplyResult {
  ok: true;
  score: Score;
}

export interface ApplyError {
  ok: false;
  error: string;
}

/**
 * Deserializes the AI's .notation response and returns a new Score.
 * Handles errors gracefully.
 */
export function applyAIEdit(
  currentScore: Score,
  newNotationText: string
): ApplyResult | ApplyError {
  try {
    const newScore = deserialize(newNotationText);

    // Preserve the original score ID for continuity
    newScore.id = currentScore.id;

    return { ok: true, score: newScore };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown parse error";
    return {
      ok: false,
      error: `Failed to parse AI output: ${message}`,
    };
  }
}
