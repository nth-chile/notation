import type { Command, EditorSnapshot } from "./Command";
import type { NoteEvent, NoteHead } from "../model/note";
import type { Voice } from "../model";
import { getInstrument } from "../model/instruments";
import { pitchToMidi, midiToPitch } from "../model/pitch";

function transposeHead(head: NoteHead, semitones: number): NoteHead {
  if (semitones === 0) return head;
  const newMidi = pitchToMidi(head.pitch) + semitones;
  return { ...head, pitch: midiToPitch(newMidi), tabInfo: undefined };
}

function transposeEvent(event: NoteEvent, semitones: number): NoteEvent {
  if (semitones === 0) return event;
  switch (event.kind) {
    case "note":
      return { ...event, head: transposeHead(event.head, semitones), tabInfo: undefined };
    case "chord":
      return { ...event, heads: event.heads.map((h) => transposeHead(h, semitones)), tabInfo: undefined };
    case "grace":
      return { ...event, head: transposeHead(event.head, semitones) };
    default:
      return event;
  }
}

export class ChangeInstrument implements Command {
  description = "Change instrument";

  constructor(
    private partIndex: number,
    private newInstrumentId: string,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);

    const part = score.parts[this.partIndex];
    if (!part) return state;

    const oldInstrument = getInstrument(part.instrumentId);
    const newInstrument = getInstrument(this.newInstrumentId);
    if (!newInstrument) return state;

    const oldTransposition = oldInstrument?.transposition ?? 0;
    const newTransposition = newInstrument.transposition ?? 0;
    // Preserve concert pitch: writtenNew = writtenOld + (oldTrans - newTrans)
    const pitchShift = oldTransposition - newTransposition;

    // Update name/abbreviation only if they still match the old defaults
    // (i.e. the user hasn't customized them).
    if (oldInstrument && part.name === oldInstrument.name) {
      part.name = newInstrument.name;
    }
    if (oldInstrument && part.abbreviation === oldInstrument.abbreviation) {
      part.abbreviation = newInstrument.abbreviation;
    }

    part.instrumentId = this.newInstrumentId;

    // Guitar-specific fields don't transfer
    if (newInstrument.id !== "guitar" && newInstrument.id !== "bass") {
      part.tuning = undefined;
      part.capo = undefined;
    }

    const collapseToSingleStaff = (oldInstrument?.staves ?? 1) > 1 && newInstrument.staves === 1;

    for (const measure of part.measures) {
      // Swap default clef for every measure
      measure.clef = { type: newInstrument.clef };

      // Transpose voices to preserve concert pitch
      if (pitchShift !== 0) {
        measure.voices = measure.voices.map((v: Voice) => ({
          ...v,
          events: v.events.map((e) => transposeEvent(e, pitchShift)),
        }));
      }

      // Collapse grand staff: all voices now live on the primary staff
      if (collapseToSingleStaff) {
        measure.voices = measure.voices.map((v: Voice) => ({ ...v, staff: undefined }));
      }
    }

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
