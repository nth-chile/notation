import type { Duration, Accidental } from "../model";

export interface CursorPosition {
  partIndex: number;
  measureIndex: number;
  voiceIndex: number;
  eventIndex: number;
}

export interface InputState {
  mode: "note" | "rest" | "select";
  duration: Duration;
  accidental: Accidental;
  voice: number;
  cursor: CursorPosition;
  octave: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export function defaultInputState(): InputState {
  return {
    mode: "note",
    duration: { type: "quarter", dots: 0 },
    accidental: "natural",
    voice: 0,
    cursor: {
      partIndex: 0,
      measureIndex: 0,
      voiceIndex: 0,
      eventIndex: 0,
    },
    octave: 4,
  };
}
