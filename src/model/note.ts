import type { Pitch } from "./pitch";
import type { Duration } from "./duration";
import type { NoteEventId } from "./ids";

export interface NoteHead {
  pitch: Pitch;
  tied?: boolean;
}

export type NoteEvent = Note | Chord | Rest;

export interface Note {
  kind: "note";
  id: NoteEventId;
  duration: Duration;
  head: NoteHead;
  stemDirection?: "up" | "down" | null;
}

export interface Chord {
  kind: "chord";
  id: NoteEventId;
  duration: Duration;
  heads: NoteHead[];
  stemDirection?: "up" | "down" | null;
}

export interface Rest {
  kind: "rest";
  id: NoteEventId;
  duration: Duration;
  staffPosition?: number;
}
