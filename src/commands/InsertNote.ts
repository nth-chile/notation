import type { Command, EditorSnapshot } from "./Command";
import type { PitchClass, Octave, Accidental, Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";
import { durationToTicks, measureCapacity, voiceTicksUsed } from "../model/duration";
import { appendMeasureToAllParts } from "./measureUtils";

export class InsertNote implements Command {
  description = "Insert note";

  constructor(
    private pitchClass: PitchClass,
    private octave: Octave,
    private accidental: Accidental,
    private duration: Duration
  ) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    // Auto-create voices up to the requested index
    const staveIndex = input.cursor.staveIndex ?? 0;
    while (measure.voices.length <= voiceIndex) {
      measure.voices.push({
        id: newId<import("../model/ids").VoiceId>("vce"),
        events: [],
        staff: staveIndex,
      });
    }
    const voice = measure.voices[voiceIndex];

    // Check measure capacity
    const cap = measureCapacity(
      measure.timeSignature.numerator,
      measure.timeSignature.denominator
    );
    const currentTicks = voiceTicksUsed(voice.events);
    const newTicks = durationToTicks(this.duration);

    if (currentTicks + newTicks > cap) {
      // Auto-advance to next measure
      const part = score.parts[partIndex];
      if (!part) return { score, inputState: input };

      // Auto-append a new measure to all parts if at the end
      if (measureIndex >= part.measures.length - 1) {
        appendMeasureToAllParts(score);
      }

      input.cursor.measureIndex = measureIndex + 1;
      input.cursor.eventIndex = 0;

      // Ensure target voice exists in next measure
      const nextMeasure = part.measures[input.cursor.measureIndex];
      while (nextMeasure.voices.length <= voiceIndex) {
        nextMeasure.voices.push({
          id: newId<import("../model/ids").VoiceId>("vce"),
          events: [],
          staff: staveIndex,
        });
      }

      // Insert in the next measure
      const nextVoice = nextMeasure.voices[voiceIndex];
      const nextCap = measureCapacity(
        nextMeasure.timeSignature.numerator,
        nextMeasure.timeSignature.denominator
      );
      const nextTicks = voiceTicksUsed(nextVoice.events);
      if (nextTicks + newTicks > nextCap) {
        // Next measure also full, just move cursor
        return { score, inputState: input };
      }

      nextVoice.events.splice(0, 0, {
        kind: "note",
        id: newId<NoteEventId>("evt"),
        duration: this.duration,
        head: {
          pitch: {
            pitchClass: this.pitchClass,
            accidental: this.accidental,
            octave: this.octave,
          },
        },
      });
      input.cursor.eventIndex = 1;
      return { score, inputState: input };
    }

    voice.events.splice(eventIndex, 0, {
      kind: "note",
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
      head: {
        pitch: {
          pitchClass: this.pitchClass,
          accidental: this.accidental,
          octave: this.octave,
        },
      },
    });

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    // Handled by CommandHistory's snapshot-based undo
    return state;
  }
}
