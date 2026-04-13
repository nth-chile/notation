import type { ClefType } from "./time";

export interface InstrumentDef {
  id: string;
  name: string;
  abbreviation: string;
  clef: ClefType;
  midiProgram: number;
  transposition: number; // semitones (0 for concert pitch); negative = sounds lower than written
  staves: number; // 1 for most, 2 for piano
  // Practical written-pitch range (MIDI numbers). Notes outside are flagged in the renderer.
  minPitch?: number;
  maxPitch?: number;
}

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: "piano",
    name: "Piano",
    abbreviation: "Pno.",
    clef: "treble",
    midiProgram: 0,
    transposition: 0,
    staves: 2,
    minPitch: 21,  // A0
    maxPitch: 108, // C8
  },
  {
    id: "guitar",
    name: "Guitar",
    abbreviation: "Gtr.",
    clef: "treble",
    midiProgram: 25,
    transposition: 0,
    staves: 1,
    minPitch: 40,  // E3 written (sounds E2)
    maxPitch: 88,  // E6 written
  },
  {
    id: "bass",
    name: "Bass",
    abbreviation: "Bass",
    clef: "bass",
    midiProgram: 33,
    transposition: 0,
    staves: 1,
    minPitch: 28,  // E2 written (sounds E1)
    maxPitch: 67,  // G4 written
  },
  {
    id: "violin",
    name: "Violin",
    abbreviation: "Vln.",
    clef: "treble",
    midiProgram: 40,
    transposition: 0,
    staves: 1,
    minPitch: 55,  // G3
    maxPitch: 103, // G7
  },
  {
    id: "viola",
    name: "Viola",
    abbreviation: "Vla.",
    clef: "alto",
    midiProgram: 41,
    transposition: 0,
    staves: 1,
    minPitch: 48,  // C3
    maxPitch: 88,  // E6
  },
  {
    id: "cello",
    name: "Cello",
    abbreviation: "Vc.",
    clef: "bass",
    midiProgram: 42,
    transposition: 0,
    staves: 1,
    minPitch: 36,  // C2
    maxPitch: 84,  // C6
  },
  {
    id: "flute",
    name: "Flute",
    abbreviation: "Fl.",
    clef: "treble",
    midiProgram: 73,
    transposition: 0,
    staves: 1,
    minPitch: 60,  // C4
    maxPitch: 96,  // C7
  },
  {
    id: "clarinet",
    name: "Clarinet",
    abbreviation: "Cl.",
    clef: "treble",
    midiProgram: 71,
    transposition: -2, // Bb clarinet: sounds a whole step lower
    staves: 1,
    minPitch: 52,  // E3 written
    maxPitch: 96,  // C7 written
  },
  {
    id: "trumpet",
    name: "Trumpet",
    abbreviation: "Tpt.",
    clef: "treble",
    midiProgram: 56,
    transposition: -2, // Bb trumpet
    staves: 1,
    minPitch: 54,  // F#3 written
    maxPitch: 86,  // D6 written
  },
  {
    id: "alto-sax",
    name: "Alto Sax",
    abbreviation: "A.Sx.",
    clef: "treble",
    midiProgram: 65,
    transposition: -9, // Eb alto sax
    staves: 1,
    minPitch: 58,  // Bb3 written
    maxPitch: 90,  // F#6 written
  },
  {
    id: "tenor-sax",
    name: "Tenor Sax",
    abbreviation: "T.Sx.",
    clef: "treble",
    midiProgram: 66,
    transposition: -14, // Bb tenor sax
    staves: 1,
    minPitch: 58,  // Bb3 written
    maxPitch: 89,  // F6 written
  },
  {
    id: "drums",
    name: "Drums",
    abbreviation: "Dr.",
    clef: "treble", // percussion clef typically rendered as treble
    midiProgram: 0, // Channel 10 in GM
    transposition: 0,
    staves: 1,
  },
];

export function getInstrument(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}
