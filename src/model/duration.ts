export type DurationType =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "16th"
  | "32nd"
  | "64th";

export interface Duration {
  type: DurationType;
  dots: 0 | 1 | 2 | 3;
}

export const TICKS_PER_QUARTER = 480;

const BASE_TICKS: Record<DurationType, number> = {
  whole: 1920,
  half: 960,
  quarter: 480,
  eighth: 240,
  "16th": 120,
  "32nd": 60,
  "64th": 30,
};

export function durationToTicks(d: Duration, tuplet?: { actual: number; normal: number }): number {
  let ticks = BASE_TICKS[d.type];
  let dotValue = ticks / 2;
  for (let i = 0; i < d.dots; i++) {
    ticks += dotValue;
    dotValue /= 2;
  }
  if (tuplet) {
    ticks = Math.round((ticks * tuplet.normal) / tuplet.actual);
  }
  return ticks;
}

export function measureCapacity(numerator: number, denominator: number): number {
  const beatTicks = (TICKS_PER_QUARTER * 4) / denominator;
  return numerator * beatTicks;
}

export const DURATION_TYPES_ORDERED: DurationType[] = [
  "whole",
  "half",
  "quarter",
  "eighth",
  "16th",
  "32nd",
  "64th",
];

/**
 * Calculates total ticks used by all events in a voice.
 */
export function voiceTicksUsed(events: { kind?: string; duration: Duration; tuplet?: { actual: number; normal: number } }[]): number {
  return events.reduce((sum, e) => e.kind === "grace" ? sum : sum + durationToTicks(e.duration, e.tuplet), 0);
}

/**
 * Decompose a tick count into a sequence of Durations using greedy largest-first.
 * Tries dotted values for more musically natural results (e.g., 720 → dotted quarter).
 */
export function ticksToDurations(ticks: number): Duration[] {
  if (ticks <= 0) return [];
  const result: Duration[] = [];
  let remaining = ticks;

  // Build candidates: each base duration with 0, 1, 2 dots, sorted largest first
  const candidates: { type: DurationType; dots: 0 | 1 | 2; ticks: number }[] = [];
  for (const type of DURATION_TYPES_ORDERED) {
    const base = BASE_TICKS[type];
    candidates.push({ type, dots: 0, ticks: base });
    candidates.push({ type, dots: 1, ticks: base + base / 2 });         // 1.5x
    candidates.push({ type, dots: 2, ticks: base + base / 2 + base / 4 }); // 1.75x
  }
  candidates.sort((a, b) => b.ticks - a.ticks);

  while (remaining > 0) {
    const fit = candidates.find((c) => c.ticks <= remaining);
    if (!fit) break; // remaining < smallest representable duration (30 ticks)
    result.push({ type: fit.type, dots: fit.dots });
    remaining -= fit.ticks;
  }

  return result;
}
