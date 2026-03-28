import type { Score, Part, Measure, Voice } from "../model/score";
import type { NoteEvent, NoteHead } from "../model/note";
import type { Pitch } from "../model/pitch";
import type { Duration } from "../model/duration";
import type { Accidental } from "../model/pitch";
import { FORMAT_HEADER } from "./format";

const ACC_MAP: Record<Accidental, string> = {
  "double-flat": "bb",
  flat: "b",
  natural: "n",
  sharp: "#",
  "double-sharp": "##",
};

const DUR_MAP: Record<string, string> = {
  whole: "w",
  half: "h",
  quarter: "q",
  eighth: "e",
  "16th": "s",
  "32nd": "t",
  "64th": "x",
};

function serializePitch(p: Pitch): string {
  return `${p.pitchClass}${p.octave}${ACC_MAP[p.accidental]}`;
}

function serializeDuration(d: Duration): string {
  return DUR_MAP[d.type] + ".".repeat(d.dots);
}

function serializeNoteHead(h: NoteHead): string {
  return serializePitch(h.pitch);
}

function serializeEvent(event: NoteEvent): string {
  const mods: string[] = [];

  switch (event.kind) {
    case "note": {
      const p = serializeNoteHead(event.head);
      const d = serializeDuration(event.duration);
      if (event.head.tied) mods.push("~");
      if (event.stemDirection === "up") mods.push("^up");
      if (event.stemDirection === "down") mods.push("^dn");
      return `  ${p} ${d}${mods.length ? " " + mods.join(" ") : ""}`;
    }
    case "chord": {
      const heads = event.heads.map(serializeNoteHead).join(" ");
      const d = serializeDuration(event.duration);
      const tiedHeads = event.heads.filter((h) => h.tied);
      if (tiedHeads.length > 0) mods.push("~");
      if (event.stemDirection === "up") mods.push("^up");
      if (event.stemDirection === "down") mods.push("^dn");
      return `  [${heads}] ${d}${mods.length ? " " + mods.join(" ") : ""}`;
    }
    case "rest": {
      const d = serializeDuration(event.duration);
      return `  r ${d}`;
    }
  }
}

function serializeVoice(v: Voice, index: number): string[] {
  const lines: string[] = [];
  lines.push(`voice ${index + 1}:`);
  for (const event of v.events) {
    lines.push(serializeEvent(event));
  }
  return lines;
}

function serializeMeasure(m: Measure, index: number): string[] {
  const lines: string[] = [];
  const attrs = [
    `clef:${m.clef.type}`,
    `time:${m.timeSignature.numerator}/${m.timeSignature.denominator}`,
    `key:${m.keySignature.fifths}`,
    `barline:${m.barlineEnd}`,
  ].join(" | ");
  lines.push(`--- MEASURE ${index + 1} | ${attrs} ---`);
  for (let vi = 0; vi < m.voices.length; vi++) {
    lines.push(...serializeVoice(m.voices[vi], vi));
  }
  return lines;
}

function serializePart(p: Part): string[] {
  const lines: string[] = [];
  lines.push(`=== PART "${p.name}" (${p.abbreviation}) ===`);
  lines.push("");
  for (let mi = 0; mi < p.measures.length; mi++) {
    lines.push(...serializeMeasure(p.measures[mi], mi));
    lines.push("");
  }
  return lines;
}

export function serialize(score: Score): string {
  const lines: string[] = [];
  lines.push(FORMAT_HEADER);
  lines.push(`title: "${score.title}"`);
  lines.push(`composer: "${score.composer}"`);
  lines.push("");

  for (const part of score.parts) {
    lines.push(...serializePart(part));
  }

  return lines.join("\n");
}
