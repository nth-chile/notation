import type { DurationType } from "../model/duration";
import type { Accidental, PitchClass } from "../model/pitch";
import type { ClefType } from "../model/time";

/**
 * MusicXML duration type names — maps internal DurationType to MusicXML <type> values.
 * MusicXML uses the same names as our model, so this is a direct mapping.
 */
export const DURATION_TYPE_TO_XML: Record<DurationType, string> = {
  whole: "whole",
  half: "half",
  quarter: "quarter",
  eighth: "eighth",
  "16th": "16th",
  "32nd": "32nd",
  "64th": "64th",
};

export const XML_TO_DURATION_TYPE: Record<string, DurationType> = {
  whole: "whole",
  half: "half",
  quarter: "quarter",
  eighth: "eighth",
  "16th": "16th",
  "32nd": "32nd",
  "64th": "64th",
};

/** MusicXML divisions per quarter note — we use 480 ticks internally but
 *  MusicXML commonly uses 1 division = 1 quarter note. We'll use 480 for lossless. */
export const MUSICXML_DIVISIONS = 480;

/** Base duration in divisions (matching our tick system). */
export const DURATION_DIVISIONS: Record<DurationType, number> = {
  whole: 1920,
  half: 960,
  quarter: 480,
  eighth: 240,
  "16th": 120,
  "32nd": 60,
  "64th": 30,
};

/** MusicXML step names (pitch classes). */
export const STEP_NAMES: PitchClass[] = ["C", "D", "E", "F", "G", "A", "B"];

/** Map our Accidental to MusicXML alter value. */
export const ACCIDENTAL_TO_ALTER: Record<Accidental, number> = {
  "double-flat": -2,
  flat: -1,
  natural: 0,
  sharp: 1,
  "double-sharp": 2,
};

/** Map MusicXML alter value to our Accidental. */
export const ALTER_TO_ACCIDENTAL: Record<number, Accidental> = {
  "-2": "double-flat",
  "-1": "flat",
  0: "natural",
  1: "sharp",
  2: "double-sharp",
};

/** Map our Accidental type to MusicXML <accidental> element text. */
export const ACCIDENTAL_TO_XML: Record<Accidental, string> = {
  "double-flat": "flat-flat",
  flat: "flat",
  natural: "natural",
  sharp: "sharp",
  "double-sharp": "double-sharp",
};

/** Map MusicXML <accidental> element text to our Accidental. */
export const XML_TO_ACCIDENTAL: Record<string, Accidental> = {
  "flat-flat": "double-flat",
  flat: "flat",
  natural: "natural",
  sharp: "sharp",
  "double-sharp": "double-sharp",
};

/** Clef type mappings. */
export const CLEF_TO_XML: Record<ClefType, { sign: string; line: number }> = {
  treble: { sign: "G", line: 2 },
  bass: { sign: "F", line: 4 },
  alto: { sign: "C", line: 3 },
  tenor: { sign: "C", line: 4 },
};

export const XML_CLEF_MAP: Record<string, ClefType> = {
  G2: "treble",
  F4: "bass",
  C3: "alto",
  C4: "tenor",
};
