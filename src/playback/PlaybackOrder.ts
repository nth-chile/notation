/**
 * Computes the order of measures for playback, following repeats,
 * volta brackets, D.S., D.C., coda, and fine marks.
 */

import type { Score } from "../model/score";

export function computePlaybackOrder(
  score: Score,
  partIndex: number
): number[] {
  const part = score.parts[partIndex];
  if (!part || part.measures.length === 0) return [];

  const measures = part.measures;
  const order: number[] = [];
  let i = 0;
  let repeatStartIdx = 0; // index of the first measure in the current repeat section
  let repeatPass = 1; // which pass through the current repeat section (1 = first, 2 = second)
  let jumped = false; // have we taken a D.S./D.C. jump?
  let seekingCoda = false; // after jump, looking for "To Coda" to jump to coda

  const MAX_MEASURES = measures.length * 10; // safety limit

  while (i < measures.length && order.length < MAX_MEASURES) {
    const m = measures[i];
    const nav = m.navigation;
    const barline = m.barlineEnd;

    // When we arrive at a measure whose PREVIOUS measure has a repeat-start barline,
    // update the repeat section start (but only on first entry, i.e., pass 1).
    if (i > 0 && repeatPass === 1) {
      const prevBarline = measures[i - 1].barlineEnd;
      if (prevBarline === "repeat-start" || prevBarline === "repeat-both") {
        repeatStartIdx = i;
      }
    }

    // Handle volta: skip measures whose volta doesn't match current pass
    if (nav?.volta) {
      if (!nav.volta.endings.includes(repeatPass)) {
        i++;
        continue;
      }
    }

    // If we're seeking a coda after a D.S./D.C. jump, check for toCoda
    if (seekingCoda && nav?.toCoda) {
      // Jump to the coda measure
      const codaIdx = findCodaMeasure(measures, i + 1);
      if (codaIdx >= 0) {
        // Add this measure first (the "To Coda" measure is played)
        order.push(i);
        i = codaIdx;
        seekingCoda = false;
        continue;
      }
    }

    // Add this measure to the order
    order.push(i);

    // Check for Fine
    if (nav?.fine && jumped) {
      break;
    }

    // Check for D.S. / D.C. marks (only take them once)
    if (nav?.dsText && !jumped) {
      jumped = true;
      const segnoIdx = findSegnoMeasure(measures);
      if (segnoIdx >= 0) {
        if (nav.dsText.toLowerCase().includes("coda")) {
          seekingCoda = true;
        }
        repeatPass = 1;
        i = segnoIdx;
        continue;
      }
    }

    if (nav?.dcText && !jumped) {
      jumped = true;
      if (nav.dcText.toLowerCase().includes("coda")) {
        seekingCoda = true;
      }
      repeatPass = 1;
      i = 0;
      continue;
    }

    // Handle repeat-end barlines
    if (barline === "repeat-end" || barline === "repeat-both") {
      if (repeatPass === 1) {
        // First time through: jump back for the repeat
        repeatPass = 2;
        i = repeatStartIdx;
        continue;
      } else {
        // Second time through: continue forward, reset for next section
        repeatPass = 1;
        if (barline === "repeat-both") {
          // This measure's end is both repeat-end and repeat-start
          // The next measure starts a new repeat section
          repeatStartIdx = i + 1;
        }
      }
    }

    i++;
  }

  return order;
}

function findSegnoMeasure(
  measures: { navigation?: { segno?: boolean } }[]
): number {
  for (let i = 0; i < measures.length; i++) {
    if (measures[i].navigation?.segno) return i;
  }
  return -1;
}

function findCodaMeasure(
  measures: { navigation?: { coda?: boolean } }[],
  startFrom: number
): number {
  for (let i = startFrom; i < measures.length; i++) {
    if (measures[i].navigation?.coda) return i;
  }
  return -1;
}
