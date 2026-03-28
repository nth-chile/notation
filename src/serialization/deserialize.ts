import type { Score, Part, Measure, Voice } from "../model/score";
import type { NoteEvent, Note, Chord, Rest, NoteHead } from "../model/note";
import type { Pitch, PitchClass, Accidental, Octave } from "../model/pitch";
import type { Duration, DurationType } from "../model/duration";
import type { ClefType, BarlineType } from "../model/time";
import type { Annotation } from "../model/annotations";
import type { Stylesheet } from "../model/stylesheet";
import { newId, type ScoreId, type PartId, type MeasureId, type VoiceId, type NoteEventId } from "../model/ids";
import { FORMAT_HEADER } from "./format";

const ACC_REVERSE: Record<string, Accidental> = {
  bb: "double-flat",
  b: "flat",
  n: "natural",
  "#": "sharp",
  "##": "double-sharp",
};

const DUR_REVERSE: Record<string, DurationType> = {
  w: "whole",
  h: "half",
  q: "quarter",
  e: "eighth",
  s: "16th",
  t: "32nd",
  x: "64th",
};

function parsePitch(token: string): Pitch {
  const pitchClass = token[0] as PitchClass;
  const octave = parseInt(token[1]) as Octave;
  const accStr = token.slice(2);
  const accidental = ACC_REVERSE[accStr] ?? "natural";
  return { pitchClass, accidental, octave };
}

function parseDuration(token: string): Duration {
  let dots = 0;
  let base = token;
  while (base.endsWith(".")) {
    dots++;
    base = base.slice(0, -1);
  }
  const type = DUR_REVERSE[base];
  if (!type) throw new Error(`Unknown duration: ${token}`);
  return { type, dots: dots as 0 | 1 | 2 | 3 };
}

function parseModifiers(tokens: string[]): { tied: boolean; stemDirection?: "up" | "down" | null } {
  let tied = false;
  let stemDirection: "up" | "down" | null | undefined;
  for (const t of tokens) {
    if (t === "~") tied = true;
    if (t === "^up") stemDirection = "up";
    if (t === "^dn") stemDirection = "down";
  }
  return { tied, stemDirection };
}

function parseEvent(line: string): NoteEvent {
  const trimmed = line.trim();

  // Rest
  if (trimmed.startsWith("r ")) {
    const parts = trimmed.split(/\s+/);
    return {
      kind: "rest",
      id: newId<NoteEventId>("evt"),
      duration: parseDuration(parts[1]),
    } satisfies Rest;
  }

  // Chord
  if (trimmed.startsWith("[")) {
    const closeBracket = trimmed.indexOf("]");
    const headsStr = trimmed.slice(1, closeBracket).trim();
    const afterBracket = trimmed.slice(closeBracket + 1).trim().split(/\s+/);
    const duration = parseDuration(afterBracket[0]);
    const mods = parseModifiers(afterBracket.slice(1));

    const heads: NoteHead[] = headsStr.split(/\s+/).map((h) => ({
      pitch: parsePitch(h),
      tied: mods.tied || undefined,
    }));

    return {
      kind: "chord",
      id: newId<NoteEventId>("evt"),
      duration,
      heads,
      stemDirection: mods.stemDirection,
    } satisfies Chord;
  }

  // Note
  const parts = trimmed.split(/\s+/);
  const pitch = parsePitch(parts[0]);
  const duration = parseDuration(parts[1]);
  const mods = parseModifiers(parts.slice(2));

  return {
    kind: "note",
    id: newId<NoteEventId>("evt"),
    duration,
    head: { pitch, tied: mods.tied || undefined },
    stemDirection: mods.stemDirection,
  } satisfies Note;
}

function parseMeasureHeader(line: string): {
  clef: ClefType;
  timeNum: number;
  timeDen: number;
  key: number;
  barline: BarlineType;
} {
  const attrs: Record<string, string> = {};
  const attrParts = line.split("|").slice(1); // skip "--- MEASURE N"
  for (const part of attrParts) {
    const cleaned = part.replace(/---/g, "").trim();
    if (!cleaned) continue;
    const [key, val] = cleaned.split(":");
    if (key && val) attrs[key.trim()] = val.trim();
  }

  const [timeNum, timeDen] = (attrs["time"] ?? "4/4").split("/").map(Number);
  return {
    clef: (attrs["clef"] ?? "treble") as ClefType,
    timeNum,
    timeDen,
    key: parseInt(attrs["key"] ?? "0"),
    barline: (attrs["barline"] ?? "single") as BarlineType,
  };
}

function parseAnnotationLine(line: string): Annotation | null {
  const trimmed = line.trim();

  // @chord <beatOffset> <text>
  if (trimmed.startsWith("@chord ")) {
    const parts = trimmed.slice(7).split(/\s+/);
    const beatOffset = parseInt(parts[0]);
    const text = parts.slice(1).join(" ");
    return { kind: "chord-symbol", text, beatOffset };
  }

  // @lyric <noteEventId> "<text>" <syllableType> <verseNumber>
  if (trimmed.startsWith("@lyric ")) {
    const match = trimmed.match(/@lyric\s+(\S+)\s+"([^"]*)"\s+(\S+)\s+(\d+)/);
    if (match) {
      return {
        kind: "lyric",
        noteEventId: match[1] as NoteEventId,
        text: match[2],
        syllableType: match[3] as "begin" | "middle" | "end" | "single",
        verseNumber: parseInt(match[4]),
      };
    }
  }

  // @rehearsal "<text>"
  if (trimmed.startsWith("@rehearsal ")) {
    const match = trimmed.match(/@rehearsal\s+"([^"]*)"/);
    if (match) {
      return { kind: "rehearsal-mark", text: match[1] };
    }
  }

  // @tempo <bpm> <beatUnit> ["text"]
  if (trimmed.startsWith("@tempo ")) {
    const match = trimmed.match(/@tempo\s+(\d+)\s+(\S+)(?:\s+"([^"]*)")?/);
    if (match) {
      return {
        kind: "tempo-mark",
        bpm: parseInt(match[1]),
        beatUnit: match[2] as DurationType,
        text: match[3] || undefined,
      };
    }
  }

  return null;
}

export function deserialize(text: string): Score {
  const lines = text.split("\n");

  if (!lines[0]?.startsWith("NOTATION")) {
    throw new Error("Not a Notation file");
  }

  let title = "Untitled";
  let composer = "";
  let tempo = 120;
  let stylesheet: Partial<Stylesheet> | undefined;
  let inStylesheet = false;
  const parts: Part[] = [];
  let currentPart: Part | null = null;
  let currentMeasure: Measure | null = null;
  let currentVoice: Voice | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//")) {
      if (inStylesheet) inStylesheet = false;
      continue;
    }

    // Stylesheet block
    if (trimmed === "stylesheet:") {
      stylesheet = {};
      inStylesheet = true;
      continue;
    }

    if (inStylesheet && line.startsWith("  ")) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match && stylesheet) {
        const key = match[1] as keyof Stylesheet;
        let val = match[2];
        // Strip quotes for string values
        if (val.startsWith('"') && val.endsWith('"')) {
          (stylesheet as Record<string, unknown>)[key] = val.slice(1, -1);
        } else if (val.includes(".")) {
          (stylesheet as Record<string, unknown>)[key] = parseFloat(val);
        } else {
          (stylesheet as Record<string, unknown>)[key] = parseInt(val);
        }
      }
      continue;
    }

    if (inStylesheet) {
      inStylesheet = false;
    }

    // Title
    if (trimmed.startsWith("title:")) {
      const match = trimmed.match(/title:\s*"(.*)"/);
      if (match) title = match[1];
      continue;
    }

    // Composer
    if (trimmed.startsWith("composer:")) {
      const match = trimmed.match(/composer:\s*"(.*)"/);
      if (match) composer = match[1];
      continue;
    }

    // Tempo
    if (trimmed.startsWith("tempo:")) {
      const match = trimmed.match(/tempo:\s*(\d+)/);
      if (match) tempo = parseInt(match[1]);
      continue;
    }

    // Part header
    if (trimmed.startsWith("=== PART")) {
      const match = trimmed.match(/=== PART "(.+)" \((.+)\) ===/);
      if (match) {
        currentPart = {
          id: newId<PartId>("prt"),
          name: match[1],
          abbreviation: match[2],
          instrumentId: "piano",
          muted: false,
          solo: false,
          measures: [],
        };
        parts.push(currentPart!);
      }
      continue;
    }

    // Part attribute: instrument
    if (trimmed.startsWith("instrument:") && currentPart) {
      const match = trimmed.match(/instrument:\s*(\S+)/);
      if (match) currentPart.instrumentId = match[1];
      continue;
    }

    // Part attribute: muted
    if (trimmed.startsWith("muted:") && currentPart) {
      currentPart.muted = trimmed.includes("true");
      continue;
    }

    // Part attribute: solo
    if (trimmed.startsWith("solo:") && currentPart) {
      currentPart.solo = trimmed.includes("true");
      continue;
    }

    // Measure header
    if (trimmed.startsWith("--- MEASURE")) {
      const header = parseMeasureHeader(trimmed);
      currentMeasure = {
        id: newId<MeasureId>("msr"),
        clef: { type: header.clef },
        timeSignature: { numerator: header.timeNum, denominator: header.timeDen },
        keySignature: { fifths: header.key },
        barlineEnd: header.barline,
        annotations: [],
        voices: [],
      };
      currentVoice = null;
      currentPart?.measures.push(currentMeasure);
      continue;
    }

    // Annotation lines
    if (trimmed.startsWith("@") && currentMeasure) {
      const annotation = parseAnnotationLine(trimmed);
      if (annotation) {
        currentMeasure.annotations.push(annotation);
      }
      continue;
    }

    // Voice header
    if (trimmed.startsWith("voice ")) {
      currentVoice = {
        id: newId<VoiceId>("vce"),
        events: [],
      };
      currentMeasure?.voices.push(currentVoice);
      continue;
    }

    // Event line (indented)
    if (line.startsWith("  ") && currentVoice) {
      // Strip inline comments
      const commentIdx = trimmed.indexOf("//");
      const clean = commentIdx >= 0 ? trimmed.slice(0, commentIdx).trim() : trimmed;
      if (clean) {
        currentVoice.events.push(parseEvent(clean));
      }
    }
  }

  const score: Score = {
    id: newId<ScoreId>("scr"),
    title,
    composer,
    formatVersion: 1,
    tempo,
    parts,
  };
  if (stylesheet && Object.keys(stylesheet).length > 0) {
    score.stylesheet = stylesheet;
  }
  return score;
}
