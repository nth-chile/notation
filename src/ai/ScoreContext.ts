import type { Score } from "../model";
import { scoreToAIJson } from "../serialization";
import type { CursorPosition } from "../input/InputState";

/**
 * Builds the system prompt for the AI.
 * Simplified — tool descriptions now carry the format reference and command list.
 */
export function buildSystemPrompt(): string {
  return `You are a musician and arranger editing a music score. You MUST use tools for every request. Never respond with only text — always call a tool.

Rules:
1. If the user asks to change the score, call patch_score or replace_score immediately. Do NOT say "I'll do that" without calling a tool.
2. If the user says you didn't do something, call get_score to check, then fix it with patch_score.
3. Write actual notes and music — don't create empty parts with just rests.
4. Keep text responses to one sentence. The user can see the score.
5. Make musical judgment calls rather than asking for clarification.`;
}

export interface ScoreContextInput {
  cursor?: CursorPosition;
  selection?: {
    partIndex: number;
    measureStart: number;
    measureEnd: number;
  };
}

/**
 * Serializes the score plus the user's current cursor/selection for the AI context.
 */
export function buildScoreContext(score: Score, input: ScoreContextInput = {}): string {
  const json = scoreToAIJson(score);
  const jsonStr = JSON.stringify(json, null, 2);

  const lines: string[] = [`Here is the current score:\n\n\`\`\`json\n${jsonStr}\n\`\`\``];

  const { cursor, selection } = input;

  if (cursor) {
    const part = score.parts[cursor.partIndex];
    const partName = part?.name ?? `part ${cursor.partIndex + 1}`;
    lines.push(
      `Cursor: part "${partName}" (index ${cursor.partIndex}), measure ${cursor.measureIndex + 1}, voice ${cursor.voiceIndex + 1}, event index ${cursor.eventIndex}, staff ${cursor.staveIndex + 1}.`
    );
  }

  if (selection) {
    const part = score.parts[selection.partIndex];
    if (part) {
      lines.push(
        `Selection: part "${part.name}" (index ${selection.partIndex}), measures ${selection.measureStart + 1}-${selection.measureEnd + 1}.`
      );
    }
  } else {
    lines.push(`Selection: none.`);
  }

  return lines.join("\n\n");
}
