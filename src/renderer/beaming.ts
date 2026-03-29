import type { NoteEvent } from "../model/note";
import type { TimeSignature } from "../model/time";
import { durationToTicks, TICKS_PER_QUARTER } from "../model/duration";
import type { DurationType } from "../model/duration";

/** Duration types that can be beamed (eighth notes and shorter). */
const BEAMABLE_DURATIONS: Set<DurationType> = new Set([
  "eighth",
  "16th",
  "32nd",
  "64th",
]);

function isBeamable(event: NoteEvent): boolean {
  if (event.kind === "rest") return false;
  return BEAMABLE_DURATIONS.has(event.duration.type);
}

/**
 * Returns the beam group size in ticks based on the time signature.
 * - 4/4, 3/4, 2/4: beam in quarter-note groups (480 ticks)
 * - 6/8, 9/8, 12/8: beam in dotted-quarter groups (720 ticks)
 * - Others: default to quarter-note groups
 */
function beamGroupTicks(timeSig: TimeSignature): number {
  // Compound meters (denominator is 8 and numerator is divisible by 3)
  if (timeSig.denominator === 8 && timeSig.numerator % 3 === 0) {
    // Dotted quarter = 480 + 240 = 720
    return TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2;
  }
  // Simple meters: group by beat (quarter note)
  return TICKS_PER_QUARTER;
}

/**
 * Returns groups of event indices that should be beamed together.
 *
 * Rules:
 * - Only eighth notes and shorter are beamed
 * - Don't beam across rests
 * - Group boundaries are determined by the time signature's beat grouping
 */
export function getBeamGroups(
  events: NoteEvent[],
  timeSig: TimeSignature
): number[][] {
  const groupSize = beamGroupTicks(timeSig);
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  let currentTick = 0;
  let currentGroupStart = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const ticks = durationToTicks(event.duration, event.tuplet);

    // Determine which beat group this event starts in
    const groupBoundary = currentGroupStart + groupSize;

    // If we've crossed a group boundary, flush current group and start new
    if (currentTick >= groupBoundary) {
      if (currentGroup.length >= 2) {
        groups.push(currentGroup);
      }
      currentGroup = [];
      // Advance group start to the current boundary
      currentGroupStart =
        Math.floor(currentTick / groupSize) * groupSize;
    }

    if (isBeamable(event)) {
      currentGroup.push(i);
    } else {
      // Non-beamable event breaks the beam group
      if (currentGroup.length >= 2) {
        groups.push(currentGroup);
      }
      currentGroup = [];
    }

    currentTick += ticks;
  }

  // Flush remaining group
  if (currentGroup.length >= 2) {
    groups.push(currentGroup);
  }

  return groups;
}
