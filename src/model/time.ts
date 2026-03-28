export type ClefType = "treble" | "bass" | "alto" | "tenor";

export interface Clef {
  type: ClefType;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface KeySignature {
  fifths: number; // positive = sharps, negative = flats, 0 = C major
  mode?: "major" | "minor";
}

export type BarlineType =
  | "single"
  | "double"
  | "final"
  | "repeat-start"
  | "repeat-end";
