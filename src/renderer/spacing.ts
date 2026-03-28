import type { NoteEvent } from "../model/note";
import { durationToTicks, TICKS_PER_QUARTER } from "../model/duration";

/**
 * Proportional spacing: returns x-offsets for each event based on duration.
 * Uses a log2 scale so longer notes get proportionally more space, but
 * not linearly (a whole note doesn't get 4x a quarter note's space).
 *
 * @param events      Array of note events
 * @param totalWidth  Available width in pixels for the events
 * @param spacingFactor  Multiplier for spacing (from stylesheet)
 * @returns Array of x-offsets (one per event)
 */
export function calculateNoteSpacing(
  events: NoteEvent[],
  totalWidth: number = 200,
  spacingFactor: number = 1.0
): number[] {
  if (events.length === 0) return [];
  if (events.length === 1) return [0];

  const MIN_SPACING = 30; // minimum pixels between consecutive events

  // Calculate the "ideal" space after each event using log2 of duration
  const quarterTicks = TICKS_PER_QUARTER;
  const idealSpaces: number[] = events.map((e) => {
    const ticks = durationToTicks(e.duration);
    // log2 ratio to quarter note, shifted so a quarter = 1.0
    const ratio = Math.log2(ticks / quarterTicks) + 1;
    // Clamp to at least 0.5 so very short notes still get some space
    return Math.max(0.5, ratio) * spacingFactor;
  });

  // The last event doesn't need trailing space; use its space as a tail
  // Sum all ideal spaces (we use all events to distribute, last gets trailing room)
  const totalIdeal = idealSpaces.reduce((s, v) => s + v, 0);

  // Scale to fit totalWidth, but enforce minimum spacing
  const offsets: number[] = [0];
  let cumulative = 0;

  for (let i = 0; i < events.length - 1; i++) {
    const rawSpace = (idealSpaces[i] / totalIdeal) * totalWidth;
    const space = Math.max(rawSpace, MIN_SPACING);
    cumulative += space;
    offsets.push(cumulative);
  }

  return offsets;
}
