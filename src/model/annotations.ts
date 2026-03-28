import type { NoteEventId } from "./ids";
import type { DurationType } from "./duration";

export interface ChordSymbol {
  kind: "chord-symbol";
  text: string; // "Cmaj7", "Dm7b5/A"
  beatOffset: number; // ticks from measure start
}

export interface Lyric {
  kind: "lyric";
  text: string;
  noteEventId: NoteEventId;
  syllableType: "begin" | "middle" | "end" | "single";
  verseNumber: number;
}

export interface RehearsalMark {
  kind: "rehearsal-mark";
  text: string; // "A", "B", "Intro", etc.
}

export interface TempoMark {
  kind: "tempo-mark";
  bpm: number;
  beatUnit: DurationType;
  text?: string; // "Allegro", etc.
}

export type Annotation = ChordSymbol | Lyric | RehearsalMark | TempoMark;
