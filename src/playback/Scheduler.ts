/**
 * Scheduler walks the Score model and converts note events to timed audio events.
 * Uses lookahead scheduling pattern.
 */

import type { Score } from "../model/score";
import type { TempoMark } from "../model/annotations";
import { durationToTicks, TICKS_PER_QUARTER } from "../model/duration";
import { pitchToMidi } from "../model/pitch";

export interface ScheduledEvent {
  /** Start time in seconds from the beginning of playback */
  time: number;
  /** MIDI pitch number (0-127) */
  midiPitch: number;
  /** Duration in seconds */
  duration: number;
  /** Start tick position in the score */
  tick: number;
}

/**
 * Get the tempo (BPM) for a given measure, checking for TempoMark annotations.
 * Falls back to the score-level tempo.
 */
function getTempoForMeasure(score: Score, measureIndex: number): number {
  // Check all parts' measures at this index for a TempoMark annotation
  for (const part of score.parts) {
    const measure = part.measures[measureIndex];
    if (!measure) continue;
    for (const ann of measure.annotations) {
      if (ann.kind === "tempo-mark") {
        return (ann as TempoMark).bpm;
      }
    }
  }
  return score.tempo;
}

/**
 * Convert ticks to seconds at a given BPM.
 */
function ticksToSeconds(ticks: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return (ticks / TICKS_PER_QUARTER) * secondsPerBeat;
}

/**
 * Schedule the entire score into a flat list of audio events.
 */
export function scheduleScore(score: Score): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];

  for (const part of score.parts) {
    let currentTimeSec = 0;
    let currentTick = 0;

    for (let mi = 0; mi < part.measures.length; mi++) {
      const measure = part.measures[mi];
      const bpm = getTempoForMeasure(score, mi);

      for (const voice of measure.voices) {
        let voiceTickOffset = 0;

        for (const event of voice.events) {
          const eventTicks = durationToTicks(event.duration);
          const eventTimeSec = currentTimeSec + ticksToSeconds(voiceTickOffset, bpm);
          const eventDurSec = ticksToSeconds(eventTicks, bpm);
          const eventTick = currentTick + voiceTickOffset;

          if (event.kind === "note") {
            const midi = pitchToMidi(event.head.pitch);
            events.push({
              time: eventTimeSec,
              midiPitch: midi,
              duration: eventDurSec,
              tick: eventTick,
            });
          } else if (event.kind === "chord") {
            for (const head of event.heads) {
              const midi = pitchToMidi(head.pitch);
              events.push({
                time: eventTimeSec,
                midiPitch: midi,
                duration: eventDurSec,
                tick: eventTick,
              });
            }
          }
          // Rests produce no sound events

          voiceTickOffset += eventTicks;
        }
      }

      // Advance time by the full measure capacity
      const measureTicks =
        (TICKS_PER_QUARTER * 4 * measure.timeSignature.numerator) /
        measure.timeSignature.denominator;
      currentTimeSec += ticksToSeconds(measureTicks, bpm);
      currentTick += measureTicks;
    }
  }

  // Sort by time for the lookahead scheduler
  events.sort((a, b) => a.time - b.time);
  return events;
}

/**
 * Build a tick-to-time mapping for cursor display.
 * Returns a function that converts a tick position to seconds.
 */
export function buildTickToTimeMap(score: Score): (tick: number) => number {
  // Build cumulative time for each measure boundary
  const boundaries: { tick: number; time: number }[] = [{ tick: 0, time: 0 }];

  if (score.parts.length === 0) return () => 0;

  const part = score.parts[0]; // Use first part for timing
  let currentTimeSec = 0;
  let currentTick = 0;

  for (let mi = 0; mi < part.measures.length; mi++) {
    const measure = part.measures[mi];
    const bpm = getTempoForMeasure(score, mi);
    const measureTicks =
      (TICKS_PER_QUARTER * 4 * measure.timeSignature.numerator) /
      measure.timeSignature.denominator;
    currentTimeSec += ticksToSeconds(measureTicks, bpm);
    currentTick += measureTicks;
    boundaries.push({ tick: currentTick, time: currentTimeSec });
  }

  return (tick: number): number => {
    // Find the segment this tick falls in
    for (let i = 1; i < boundaries.length; i++) {
      if (tick <= boundaries[i].tick) {
        const prev = boundaries[i - 1];
        const curr = boundaries[i];
        const frac = (tick - prev.tick) / (curr.tick - prev.tick);
        return prev.time + frac * (curr.time - prev.time);
      }
    }
    // Past the end
    return boundaries[boundaries.length - 1].time;
  };
}

/**
 * Build a time-to-tick mapping for playback cursor.
 * Returns a function that converts seconds to tick position.
 */
export function buildTimeToTickMap(score: Score): (time: number) => number {
  const boundaries: { tick: number; time: number }[] = [{ tick: 0, time: 0 }];

  if (score.parts.length === 0) return () => 0;

  const part = score.parts[0];
  let currentTimeSec = 0;
  let currentTick = 0;

  for (let mi = 0; mi < part.measures.length; mi++) {
    const measure = part.measures[mi];
    const bpm = getTempoForMeasure(score, mi);
    const measureTicks =
      (TICKS_PER_QUARTER * 4 * measure.timeSignature.numerator) /
      measure.timeSignature.denominator;
    currentTimeSec += ticksToSeconds(measureTicks, bpm);
    currentTick += measureTicks;
    boundaries.push({ tick: currentTick, time: currentTimeSec });
  }

  return (time: number): number => {
    for (let i = 1; i < boundaries.length; i++) {
      if (time <= boundaries[i].time) {
        const prev = boundaries[i - 1];
        const curr = boundaries[i];
        const frac = (time - prev.time) / (curr.time - prev.time);
        return prev.tick + frac * (curr.tick - prev.tick);
      }
    }
    return boundaries[boundaries.length - 1].tick;
  };
}
