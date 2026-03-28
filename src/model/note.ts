import type { Pitch } from "./pitch";
import type { Duration } from "./duration";
import type { NoteEventId } from "./ids";
import type { TabInfo } from "./guitar";

export type Articulation =
  | { kind: "bend"; semitones: number }
  | { kind: "slide-up" }
  | { kind: "slide-down" }
  | { kind: "hammer-on" }
  | { kind: "pull-off" }
  | { kind: "vibrato" }
  | { kind: "palm-mute" }
  | { kind: "harmonic" };

export interface NoteHead {
  pitch: Pitch;
  tied?: boolean;
  tabInfo?: TabInfo;
}

export type NoteEvent = Note | Chord | Rest | Slash;

export interface Note {
  kind: "note";
  id: NoteEventId;
  duration: Duration;
  head: NoteHead;
  stemDirection?: "up" | "down" | null;
  tabInfo?: TabInfo;
  articulations?: Articulation[];
}

export interface Chord {
  kind: "chord";
  id: NoteEventId;
  duration: Duration;
  heads: NoteHead[];
  stemDirection?: "up" | "down" | null;
  tabInfo?: TabInfo;
  articulations?: Articulation[];
}

export interface Rest {
  kind: "rest";
  id: NoteEventId;
  duration: Duration;
  staffPosition?: number;
}

export interface Slash {
  kind: "slash";
  id: NoteEventId;
  duration: Duration;
}
