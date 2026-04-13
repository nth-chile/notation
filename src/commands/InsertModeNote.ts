import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental, Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";
import { shiftVoiceForward } from "../model/voiceInsert";
import { measure as makeMeasure, voice as makeVoice } from "../model/factory";
import { resolveVoiceForStaff } from "./measureUtils";

/**
 * Insert mode: inserts a note and pushes subsequent events forward.
 * Handles measure overflow, note splitting at barlines, and annotation migration.
 */
export class InsertModeNote implements Command {
  description = "Insert note (insert mode)";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private duration: Duration,
    private isRest = false,
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, eventIndex } = input.cursor;

    const part = score.parts[partIndex];
    if (!part) return state;

    const measure = part.measures[measureIndex];
    if (!measure) return state;

    // Resolve voice index to one matching the cursor's staff (grand staff).
    const staveIndex = input.cursor.staveIndex ?? 0;
    const voiceIndex = resolveVoiceForStaff(measure, input.cursor.voiceIndex, staveIndex);
    input.cursor.voiceIndex = voiceIndex;

    const newEvent = this.isRest
      ? {
          kind: "rest" as const,
          id: newId<NoteEventId>("evt"),
          duration: this.duration,
        }
      : {
          kind: "note" as const,
          id: newId<NoteEventId>("evt"),
          duration: this.duration,
          head: {
            pitch: {
              pitchClass: this.pitchClass,
              accidental: this.accidental,
              octave: this.octave,
            },
          },
        };

    const measureCountBefore = part.measures.length;
    shiftVoiceForward(part, voiceIndex, measureIndex, eventIndex, newEvent);

    // If new measures were created, add empty measures to all other parts too
    const newMeasureCount = part.measures.length - measureCountBefore;
    if (newMeasureCount > 0) {
      for (let pi = 0; pi < score.parts.length; pi++) {
        if (pi === partIndex) continue;
        const otherPart = score.parts[pi];
        for (let i = 0; i < newMeasureCount; i++) {
          const ref = part.measures[measureCountBefore + i];
          otherPart.measures.push(makeMeasure([makeVoice([])], {
            timeSignature: ref.timeSignature,
            keySignature: ref.keySignature,
            clef: ref.clef,
          }));
        }
      }
    }

    // Advance cursor past the inserted event
    input.cursor.eventIndex = eventIndex + 1;

    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
