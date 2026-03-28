import type { Score } from "../model";
import { serialize } from "../serialization";

/**
 * Builds the system prompt that teaches the AI about the .notation format.
 */
export function buildSystemPrompt(): string {
  return `You are an expert music theory assistant embedded in Notation, an AI-native music notation editor. You can read and edit musical scores in the .notation text format.

## .notation Format Specification

A .notation file has this structure:

\`\`\`
NOTATION v1
title: "Title"
composer: "Composer"
tempo: 120

=== PART "Part Name" (Abbr) ===
instrument: piano

--- MEASURE 1 | clef:treble | time:4/4 | key:0 | barline:single ---
voice 1:
  C4n q
  D4n q
  E4n q
  F4n q
\`\`\`

### Pitch Format
Pitches are written as: \`<pitchClass><octave><accidental>\`
- Pitch classes: C, D, E, F, G, A, B
- Octaves: 0-9 (middle C = C4)
- Accidentals: n (natural), # (sharp), b (flat), ## (double-sharp), bb (double-flat)
- Examples: C4n (middle C), F#5 is F5#, Bb3 is B3b

### Duration Format
- w = whole, h = half, q = quarter, e = eighth, s = 16th, t = 32nd, x = 64th
- Dots: append "." for dotted, ".." for double-dotted
- Examples: q (quarter), h. (dotted half), e (eighth)

### Note Types
- Single note: \`  C4n q\` (pitch + duration)
- Chord: \`  [C4n E4n G4n] q\` (bracketed pitches + duration)
- Rest: \`  r q\` (r + duration)

### Modifiers (after duration)
- \`~\` = tied to next note
- \`^up\` = stem up, \`^dn\` = stem down

### Annotations (before voice lines in a measure)
- \`@chord <beatOffset> <text>\` — chord symbol (e.g., \`@chord 0 Cmaj7\`)
- \`@lyric <noteEventId> "<text>" <syllableType> <verseNumber>\` — lyrics
- \`@rehearsal "<text>"\` — rehearsal mark (e.g., \`@rehearsal "A"\`)
- \`@tempo <bpm> <beatUnit>\` — tempo marking (e.g., \`@tempo 140 quarter\`)

### Measure Attributes
Each measure header has: clef, time signature, key signature (fifths: 0=C, 1=G, -1=F, etc.), and barline type.
Barline types: single, double, final, repeat-start, repeat-end, repeat-both.

### Key Signatures (fifths)
-7=Cb, -6=Gb, -5=Db, -4=Ab, -3=Eb, -2=Bb, -1=F, 0=C, 1=G, 2=D, 3=A, 4=E, 5=B, 6=F#, 7=C#

## Instructions
When the user asks you to edit the score, respond with the COMPLETE modified score inside a fenced code block with the \`notation\` language tag:

\`\`\`notation
NOTATION v1
...entire score...
\`\`\`

Always return the COMPLETE score, not just the changed parts. Preserve all existing content that wasn't asked to change.
If the user asks a question about music theory or the score without requesting edits, respond conversationally without a code block.`;
}

/**
 * Serializes the score (or a selection) for inclusion in the AI context.
 */
export function buildScoreContext(
  score: Score,
  selection?: {
    partIndex: number;
    measureStart: number;
    measureEnd: number;
  }
): string {
  if (!selection) {
    return `Here is the current score:\n\n\`\`\`notation\n${serialize(score)}\n\`\`\``;
  }

  // Build a partial score with only the selected measures
  const part = score.parts[selection.partIndex];
  if (!part) {
    return `Here is the current score:\n\n\`\`\`notation\n${serialize(score)}\n\`\`\``;
  }

  const selectedMeasures = part.measures.slice(
    selection.measureStart,
    selection.measureEnd + 1
  );

  const lines: string[] = [];
  lines.push(
    `Here is the current score (showing Part "${part.name}", measures ${selection.measureStart + 1}-${selection.measureEnd + 1}):`
  );
  lines.push("");
  lines.push("```notation");
  lines.push(serialize(score));
  lines.push("```");
  lines.push("");
  lines.push(
    `Focus on Part "${part.name}" (index ${selection.partIndex}), measures ${selection.measureStart + 1} through ${selection.measureEnd + 1} (${selectedMeasures.length} measures selected).`
  );

  return lines.join("\n");
}

/**
 * Extracts a .notation code block from the AI's response text.
 * Returns the text inside the code block, or null if none found.
 */
export function extractScoreFromResponse(response: string): string | null {
  // Match ```notation ... ``` blocks
  const notationMatch = response.match(
    /```notation\s*\n([\s\S]*?)```/
  );
  if (notationMatch) {
    return notationMatch[1].trim();
  }

  // Fallback: match any code block that starts with NOTATION v1
  const genericMatch = response.match(
    /```\s*\n(NOTATION v1[\s\S]*?)```/
  );
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  return null;
}
