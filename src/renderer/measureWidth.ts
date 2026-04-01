import type { Measure } from "../model/score";
import type { Stylesheet } from "../model/stylesheet";
import { defaultStylesheet } from "../model/stylesheet";

/**
 * Calculate adaptive measure width based on content density.
 *
 * Factors:
 * - Number of events across all voices
 * - Whether clef/key/time sig decorations are present (first measure, changes)
 * - Stylesheet min/max bounds
 */
export function calculateMeasureWidth(
  measure: Measure,
  options?: {
    showClef?: boolean;
    showTimeSig?: boolean;
    showKeySig?: boolean;
    stylesheet?: Partial<Stylesheet>;
  }
): number {
  const style = { ...defaultStylesheet(), ...options?.stylesheet };
  const minWidth = style.measureMinWidth;
  const maxWidth = style.measureMaxWidth;

  // Count total events across all voices
  let eventCount = 0;
  for (const voice of measure.voices) {
    eventCount += voice.events.length;
  }

  // Base width: scale by event count
  // ~50px per event, starting from a baseline
  const BASE = 100;
  const PER_EVENT = 35;
  let width = BASE + eventCount * PER_EVENT;

  // Add space for decorations
  if (options?.showClef) width += 30;
  if (options?.showKeySig) {
    const sharpsFlats = Math.abs(measure.keySignature.fifths);
    width += 10 + sharpsFlats * 8;
  }
  if (options?.showTimeSig) width += 30;

  // Add space for annotations
  if (measure.annotations.length > 0) {
    width += 15;
  }

  // Pickup measures use a smaller base — they only need space for their events,
  // not the full measure baseline
  if (measure.isPickup) {
    width = 40 + eventCount * PER_EVENT;
  }

  return Math.max(minWidth, Math.min(maxWidth, width));
}
