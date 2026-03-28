import type { NoteEvent } from "./note";
import type { Clef, TimeSignature, KeySignature, BarlineType } from "./time";
import type { ScoreId, PartId, MeasureId, VoiceId } from "./ids";
import type { Annotation } from "./annotations";

export interface Score {
  id: ScoreId;
  title: string;
  composer: string;
  formatVersion: number;
  tempo: number;
  parts: Part[];
}

export interface Part {
  id: PartId;
  name: string;
  abbreviation: string;
  measures: Measure[];
}

export interface Measure {
  id: MeasureId;
  clef: Clef;
  timeSignature: TimeSignature;
  keySignature: KeySignature;
  barlineEnd: BarlineType;
  annotations: Annotation[];
  voices: Voice[];
}

export interface Voice {
  id: VoiceId;
  events: NoteEvent[];
}
