import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Beam, StaveConnector } from "vexflow";
import type { Measure, NoteEvent, NoteEventId } from "../model";
import type { Annotation } from "../model/annotations";
import type { Stylesheet } from "../model/stylesheet";
import { resolveStylesheet } from "../model/stylesheet";
import { durationToTicks as durationToTicksFn, measureCapacity } from "../model/duration";
import { getBeamGroups } from "./beaming";

export interface RenderContext {
  renderer: Renderer;
  context: ReturnType<Renderer["getContext"]>;
}

export interface NoteBox {
  id: NoteEventId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasureRenderResult {
  noteBoxes: NoteBox[];
  staveY: number;
  staveX: number;
  width: number;
}

const ACC_VEX: Record<string, string> = {
  sharp: "#",
  flat: "b",
  "double-sharp": "##",
  "double-flat": "bb",
};

const DUR_VEX: Record<string, string> = {
  whole: "w",
  half: "h",
  quarter: "q",
  eighth: "8",
  "16th": "16",
  "32nd": "32",
  "64th": "64",
};

export function initRenderer(canvas: HTMLCanvasElement): RenderContext {
  const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
  renderer.resize(canvas.width, canvas.height);
  const context = renderer.getContext();
  return { renderer, context };
}

function pitchToVexKey(p: { pitchClass: string; octave: number }): string {
  return `${p.pitchClass.toLowerCase()}/${p.octave}`;
}

function eventToStaveNote(
  event: NoteEvent,
  stemDirection?: "up" | "down"
): StaveNote | null {
  switch (event.kind) {
    case "note": {
      const key = pitchToVexKey(event.head.pitch);
      const dur = DUR_VEX[event.duration.type];
      const opts: { keys: string[]; duration: string; stemDirection?: number } = {
        keys: [key],
        duration: dur,
      };
      if (stemDirection === "up") opts.stemDirection = 1;
      else if (stemDirection === "down") opts.stemDirection = -1;
      const sn = new StaveNote(opts);
      const acc = event.head.pitch.accidental;
      if (acc !== "natural" && ACC_VEX[acc]) {
        sn.addModifier(new Accidental(ACC_VEX[acc]));
      }
      for (let i = 0; i < event.duration.dots; i++) {
        Dot.buildAndAttach([sn], { all: true });
      }
      return sn;
    }
    case "chord": {
      const keys = event.heads.map((h) => pitchToVexKey(h.pitch));
      const dur = DUR_VEX[event.duration.type];
      const opts: { keys: string[]; duration: string; stemDirection?: number } = {
        keys,
        duration: dur,
      };
      if (stemDirection === "up") opts.stemDirection = 1;
      else if (stemDirection === "down") opts.stemDirection = -1;
      const sn = new StaveNote(opts);
      event.heads.forEach((h, idx) => {
        const acc = h.pitch.accidental;
        if (acc !== "natural" && ACC_VEX[acc]) {
          sn.addModifier(new Accidental(ACC_VEX[acc]), idx);
        }
      });
      for (let i = 0; i < event.duration.dots; i++) {
        Dot.buildAndAttach([sn], { all: true });
      }
      return sn;
    }
    case "rest": {
      const dur = DUR_VEX[event.duration.type] + "r";
      const sn = new StaveNote({ keys: ["b/4"], duration: dur });
      for (let i = 0; i < event.duration.dots; i++) {
        Dot.buildAndAttach([sn], { all: true });
      }
      return sn;
    }
  }
}

const CLEF_VEX: Record<string, string> = {
  treble: "treble",
  bass: "bass",
  alto: "alto",
  tenor: "tenor",
};

const KEY_SIG_MAP: Record<number, string> = {
  "-7": "Cb",
  "-6": "Gb",
  "-5": "Db",
  "-4": "Ab",
  "-3": "Eb",
  "-2": "Bb",
  "-1": "F",
  "0": "C",
  "1": "G",
  "2": "D",
  "3": "A",
  "4": "E",
  "5": "B",
  "6": "F#",
  "7": "C#",
};

/** Stem direction per voice index: 0=auto (undefined), 1=up, 2=down */
function voiceStemDirection(voiceIndex: number): "up" | "down" | undefined {
  if (voiceIndex === 1) return "up";
  if (voiceIndex === 2) return "down";
  return undefined;
}

export function renderMeasure(
  ctx: RenderContext,
  m: Measure,
  x: number,
  y: number,
  width: number,
  showClef: boolean,
  showTimeSig: boolean,
  showKeySig: boolean,
  stylesheet?: Partial<Stylesheet>
): MeasureRenderResult {
  const style = resolveStylesheet(stylesheet);

  const stave = new Stave(x, y, width);
  if (showClef) stave.addClef(CLEF_VEX[m.clef.type] || "treble");
  if (showKeySig) {
    const keySig = KEY_SIG_MAP[m.keySignature.fifths] ?? "C";
    stave.addKeySignature(keySig);
  }
  if (showTimeSig) {
    stave.addTimeSignature(`${m.timeSignature.numerator}/${m.timeSignature.denominator}`);
  }
  stave.setContext(ctx.context).draw();

  const noteBoxes: NoteBox[] = [];
  const vfVoices: Voice[] = [];
  const allBeams: Beam[] = [];

  // Build VexFlow voices for all model voices that have events
  for (let vi = 0; vi < m.voices.length; vi++) {
    const modelVoice = m.voices[vi];
    if (!modelVoice || modelVoice.events.length === 0) continue;

    const stemDir = voiceStemDirection(vi);
    const staveNotes: StaveNote[] = [];
    const eventIds: NoteEventId[] = [];

    for (const event of modelVoice.events) {
      const sn = eventToStaveNote(event, stemDir);
      if (sn) {
        staveNotes.push(sn);
        eventIds.push(event.id);
      }
    }

    if (staveNotes.length > 0) {
      const totalTicks = modelVoice.events.reduce((sum, e) => {
        return sum + durationToTicksFn(e.duration);
      }, 0);
      const beats = totalTicks / 480;

      const vfVoice = new Voice({
        numBeats: beats,
        beatValue: 4,
      }).setStrict(false);
      vfVoice.addTickables(staveNotes);
      vfVoices.push(vfVoice);

      // Compute beam groups for this voice
      const beamGroups = getBeamGroups(modelVoice.events, m.timeSignature);
      for (const group of beamGroups) {
        const beamNotes = group.map((idx) => staveNotes[idx]);
        if (beamNotes.length >= 2) {
          try {
            allBeams.push(new Beam(beamNotes));
          } catch {
            // If VexFlow rejects the beam (e.g. incompatible notes), skip it
          }
        }
      }

      // Store staveNotes + eventIds for bounding box collection after draw
      (vfVoice as unknown as { __staveNotes: StaveNote[]; __eventIds: NoteEventId[] }).__staveNotes = staveNotes;
      (vfVoice as unknown as { __staveNotes: StaveNote[]; __eventIds: NoteEventId[] }).__eventIds = eventIds;
    }
  }

  // Format and draw all voices together
  if (vfVoices.length > 0) {
    const formatter = new Formatter();
    formatter.joinVoices(vfVoices);

    // Use proportional spacing via softmax factor scaled by stylesheet spacingFactor
    const formattingWidth = width - (stave.getNoteStartX() - x) - 10;
    formatter.format(vfVoices, formattingWidth * style.spacingFactor);

    for (const vfVoice of vfVoices) {
      vfVoice.draw(ctx.context, stave);

      // Collect bounding boxes
      const data = vfVoice as unknown as { __staveNotes: StaveNote[]; __eventIds: NoteEventId[] };
      data.__staveNotes.forEach((sn, idx) => {
        const bb = sn.getBoundingBox();
        if (bb) {
          noteBoxes.push({
            id: data.__eventIds[idx],
            x: bb.getX(),
            y: bb.getY(),
            width: bb.getW(),
            height: bb.getH(),
          });
        }
      });
    }

    // Draw beams after voices
    for (const beam of allBeams) {
      beam.setContext(ctx.context).draw();
    }
  }

  // Render annotations (chord symbols above, lyrics below, rehearsal marks, tempo marks)
  if (m.annotations.length > 0) {
    const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
    if (rawCtx.save) {
      const noteStartX = stave.getNoteStartX();
      const totalCapacity = measureCapacity(m.timeSignature.numerator, m.timeSignature.denominator);

      for (const annotation of m.annotations) {
        switch (annotation.kind) {
          case "chord-symbol": {
            // Position based on beat offset proportion within the measure
            const proportion = totalCapacity > 0 ? annotation.beatOffset / totalCapacity : 0;
            const usableWidth = width - (noteStartX - x) - 10;
            const chordX = noteStartX + proportion * usableWidth;
            rawCtx.save();
            rawCtx.font = `bold ${style.chordSymbolSize}px sans-serif`;
            rawCtx.fillStyle = "#333";
            rawCtx.fillText(annotation.text, chordX, y + 10);
            rawCtx.restore();
            break;
          }
          case "lyric": {
            // Find matching noteBox by noteEventId
            const box = noteBoxes.find((nb) => nb.id === annotation.noteEventId);
            if (box) {
              rawCtx.save();
              rawCtx.font = `italic ${style.lyricSize}px ${style.fontFamily}`;
              rawCtx.fillStyle = "#555";
              rawCtx.textAlign = "center";
              const lyricText =
                annotation.syllableType === "begin" || annotation.syllableType === "middle"
                  ? annotation.text + "-"
                  : annotation.text;
              rawCtx.fillText(lyricText, box.x + box.width / 2, y + 90);
              rawCtx.textAlign = "start";
              rawCtx.restore();
            }
            break;
          }
          case "rehearsal-mark": {
            rawCtx.save();
            rawCtx.font = "bold 14px sans-serif";
            rawCtx.fillStyle = "#000";
            const textWidth = rawCtx.measureText(annotation.text).width;
            const boxPadding = 4;
            rawCtx.strokeStyle = "#000";
            rawCtx.lineWidth = 1.5;
            rawCtx.strokeRect(
              x + 2 - boxPadding,
              y - 6 - boxPadding,
              textWidth + boxPadding * 2,
              14 + boxPadding * 2
            );
            rawCtx.fillText(annotation.text, x + 2, y + 6);
            rawCtx.restore();
            break;
          }
          case "tempo-mark": {
            rawCtx.save();
            rawCtx.font = "bold 12px sans-serif";
            rawCtx.fillStyle = "#000";
            const label = annotation.text
              ? `${annotation.text} (${annotation.beatUnit} = ${annotation.bpm})`
              : `${annotation.beatUnit} = ${annotation.bpm}`;
            rawCtx.fillText(label, x + 2, y - 4);
            rawCtx.restore();
            break;
          }
        }
      }
    }
  }

  return {
    noteBoxes,
    staveY: y,
    staveX: x,
    width,
  };
}

/**
 * Render a system barline connecting all staves vertically.
 */
export function renderSystemBarline(
  ctx: RenderContext,
  x: number,
  topY: number,
  bottomY: number
): void {
  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (rawCtx.save) {
    rawCtx.save();
    rawCtx.strokeStyle = "#000";
    rawCtx.lineWidth = 1.5;
    rawCtx.beginPath();
    rawCtx.moveTo(x, topY);
    rawCtx.lineTo(x, bottomY);
    rawCtx.stroke();
    rawCtx.restore();
  }
}

/**
 * Render a brace for grand staff instruments (e.g., piano).
 */
export function renderBrace(
  ctx: RenderContext,
  x: number,
  topY: number,
  bottomY: number
): void {
  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (rawCtx.save) {
    rawCtx.save();
    rawCtx.strokeStyle = "#000";
    rawCtx.lineWidth = 2;
    const midY = (topY + bottomY) / 2;
    const height = bottomY - topY;
    // Draw a simple curly brace using bezier curves
    rawCtx.beginPath();
    rawCtx.moveTo(x, topY);
    rawCtx.bezierCurveTo(x - 8, topY + height * 0.25, x - 8, midY - 5, x - 3, midY);
    rawCtx.bezierCurveTo(x - 8, midY + 5, x - 8, topY + height * 0.75, x, bottomY);
    rawCtx.stroke();
    rawCtx.restore();
  }
}

export function clearCanvas(ctx: RenderContext, canvas: HTMLCanvasElement): void {
  ctx.context.clearRect(0, 0, canvas.width, canvas.height);
}
