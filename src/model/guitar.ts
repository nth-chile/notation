import type { Pitch } from "./pitch";
import { pitchToMidi } from "./pitch";

export interface TabInfo {
  string: number; // 1-6 (high E = 1)
  fret: number;
}

export interface Tuning {
  name: string;
  strings: number[]; // MIDI note for each open string, low to high (string 6 to string 1)
}

export const STANDARD_TUNING: Tuning = {
  name: "Standard",
  strings: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
};

export const DROP_D_TUNING: Tuning = {
  name: "Drop D",
  strings: [38, 45, 50, 55, 59, 64], // D2 A2 D3 G3 B3 E4
};

export const OPEN_G_TUNING: Tuning = {
  name: "Open G",
  strings: [38, 43, 50, 55, 59, 62], // D2 G2 D3 G3 B3 D4
};

/**
 * Find the most playable string/fret for a pitch on a guitar with the given tuning.
 * Prefers lower frets and middle strings when possible.
 */
export function pitchToTab(pitch: Pitch, tuning: Tuning = STANDARD_TUNING): TabInfo {
  const midi = pitchToMidi(pitch);
  const MAX_FRET = 24;

  let bestString = 1;
  let bestFret = 0;
  let bestScore = Infinity;

  // strings array is indexed low to high: [0]=string6, [1]=string5, ..., [5]=string1
  for (let i = 0; i < tuning.strings.length; i++) {
    const openMidi = tuning.strings[i];
    const fret = midi - openMidi;

    if (fret < 0 || fret > MAX_FRET) continue;

    // String number: 6 - i (since array is low-to-high, string 6 is index 0)
    const stringNum = tuning.strings.length - i;

    // Scoring: prefer lower frets, slight preference for middle strings
    const fretPenalty = fret;
    const stringPenalty = Math.abs(stringNum - 3.5) * 0.5; // prefer middle strings
    const score = fretPenalty + stringPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestString = stringNum;
      bestFret = fret;
    }
  }

  return { string: bestString, fret: bestFret };
}
