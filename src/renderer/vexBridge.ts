import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from "vexflow";
import type { Measure, NoteEvent, NoteEventId } from "../model";
import { durationToTicks as durationToTicksFn } from "../model/duration";

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

function eventToStaveNote(event: NoteEvent): StaveNote | null {
  switch (event.kind) {
    case "note": {
      const key = pitchToVexKey(event.head.pitch);
      const dur = DUR_VEX[event.duration.type];
      const sn = new StaveNote({ keys: [key], duration: dur });
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
      const sn = new StaveNote({ keys, duration: dur });
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

export function renderMeasure(
  ctx: RenderContext,
  m: Measure,
  x: number,
  y: number,
  width: number,
  showClef: boolean,
  showTimeSig: boolean,
  showKeySig: boolean
): MeasureRenderResult {
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

  // Render first voice (Phase 1: single voice rendering)
  const voice0 = m.voices[0];
  if (voice0 && voice0.events.length > 0) {
    const staveNotes: StaveNote[] = [];
    const eventIds: NoteEventId[] = [];

    for (const event of voice0.events) {
      const sn = eventToStaveNote(event);
      if (sn) {
        staveNotes.push(sn);
        eventIds.push(event.id);
      }
    }

    if (staveNotes.length > 0) {
      const totalTicks = voice0.events.reduce((sum, e) => {
        return sum + durationToTicksFn(e.duration);
      }, 0);
      const beats = totalTicks / 480;

      const vfVoice = new Voice({
        numBeats: beats,
        beatValue: 4,
      }).setStrict(false);
      vfVoice.addTickables(staveNotes);

      new Formatter().joinVoices([vfVoice]).format([vfVoice], width - (stave.getNoteStartX() - x) - 10);
      vfVoice.draw(ctx.context, stave);

      // Collect bounding boxes
      staveNotes.forEach((sn, idx) => {
        const bb = sn.getBoundingBox();
        if (bb) {
          noteBoxes.push({
            id: eventIds[idx],
            x: bb.getX(),
            y: bb.getY(),
            width: bb.getW(),
            height: bb.getH(),
          });
        }
      });
    }
  }

  return {
    noteBoxes,
    staveY: y,
    staveX: x,
    width,
  };
}

export function clearCanvas(ctx: RenderContext, canvas: HTMLCanvasElement): void {
  ctx.context.clearRect(0, 0, canvas.width, canvas.height);
}
