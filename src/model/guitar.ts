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

export const DADGAD_TUNING: Tuning = {
  name: "DADGAD",
  strings: [38, 45, 50, 55, 57, 62], // D2 A2 D3 G3 A3 D4
};

export const OPEN_D_TUNING: Tuning = {
  name: "Open D",
  strings: [38, 45, 50, 54, 57, 62], // D2 A2 D3 F#3 A3 D4
};

export const HALF_STEP_DOWN_TUNING: Tuning = {
  name: "Half Step Down",
  strings: [39, 44, 49, 54, 58, 63], // Eb2 Ab2 Db3 Gb3 Bb3 Eb4
};

export const ALL_TUNINGS: Tuning[] = [
  STANDARD_TUNING,
  DROP_D_TUNING,
  OPEN_G_TUNING,
  OPEN_D_TUNING,
  DADGAD_TUNING,
  HALF_STEP_DOWN_TUNING,
];

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
