import type { Command, EditorSnapshot } from "./Command";
import type { Duration } from "../model";
import { newId, type NoteEventId } from "../model/ids";
import { durationToTicks, measureCapacity, voiceTicksUsed } from "../model/duration";
import { appendMeasureToAllParts, resolveVoiceForStaff } from "./measureUtils";

export class InsertRest implements Command {
  description = "Insert rest";

  constructor(private duration: Duration) {}

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    if (!measure) return state;

    const staveIndex = input.cursor.staveIndex ?? 0;
    const voiceIndex = resolveVoiceForStaff(measure, input.cursor.voiceIndex, staveIndex);
    input.cursor.voiceIndex = voiceIndex;
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
          staff: input.cursor.staveIndex ?? 0,
        });
      }

      const nextVoice = nextMeasure.voices[voiceIndex];
      const nextCap = measureCapacity(
        nextMeasure.timeSignature.numerator,
        nextMeasure.timeSignature.denominator
      );
      const nextTicks = voiceTicksUsed(nextVoice.events);

      const newRest = {
        kind: "rest" as const,
        id: newId<NoteEventId>("evt"),
        duration: this.duration,
      };

      if (nextTicks + newTicks > nextCap) {
        // Next measure is full — overwrite the first event if it exists
        // (e.g. a whole rest from MusicXML import), otherwise just move cursor.
        if (nextVoice.events.length > 0) {
          nextVoice.events[0] = newRest;
          input.cursor.eventIndex = 1;
        }
        return { score, inputState: input };
      }

      nextVoice.events.splice(0, 0, newRest);
      input.cursor.eventIndex = 1;
      return { score, inputState: input };
    }

    voice.events.splice(eventIndex, 0, {
      kind: "rest",
      id: newId<NoteEventId>("evt"),
      duration: this.duration,
    });

    input.cursor.eventIndex = eventIndex + 1;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
