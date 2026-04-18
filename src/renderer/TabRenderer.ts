import { TabStave, TabNote, GhostNote, Formatter, Voice, Bend, Vibrato, TabSlide, TabTie, Element, Tremolo } from "vexflow";
import type { Measure, NoteEvent, NoteEventId } from "../model";
import type { Articulation } from "../model/note";
import { pitchToTab, STANDARD_TUNING, type Tuning } from "../model/guitar";
import { durationToTicks as durationToTicksFn } from "../model/duration";
import type { RenderContext, NoteBox } from "./vexBridge";
import { applyBarline, applyStaveDecorations, drawStaveAnnotations, computeChordTieDirections } from "./vexBridge";
import { TAB_STAFF_HEIGHT } from "./SystemLayout";
import { INK } from "./colors";

// Monkey-patch TabNote.tabToElement to use sans-serif for all frets.
// VexFlow renders "X" as a double-sharp glyph (accidentalDoubleSharp) which looks wrong.
// Override to render "X" as plain text in the same font as fret numbers.
export const TAB_FRET_FONT_SIZE = 11;
export const TAB_FRET_FONT_WEIGHT = "600";

TabNote.tabToElement = (fret: string) => {
  const el = new Element("TabNote.text");
  el.setText(fret.toUpperCase() === "X" ? "X" : fret);
  el.setFont("Arial, sans-serif", TAB_FRET_FONT_SIZE, TAB_FRET_FONT_WEIGHT);
  el.setYShift(el.getHeight() / 2);
  return el;
};

/** Width (in canvas units) of the tab staff lines. VexFlow default is 1 — we
 *  bump it a touch for readability without making it heavy. */
export const TAB_LINE_WIDTH = 1.25;
/** Extra padding inserted between the bar's clef/time-sig/key-sig and the
 *  first note head, so fret digits don't crowd the bar start. */
export const TAB_NOTE_START_PADDING = 14;

export interface TabMeasureRenderResult {
  noteBoxes: NoteBox[];
  staveY: number;
  staveX: number;
  width: number;
  vexStave?: import("vexflow").Stave;
  tabNoteMap?: Map<import("../model").NoteEventId, TabNote>;
}

const DUR_VEX: Record<string, string> = {
  whole: "w",
  half: "h",
  quarter: "q",
  eighth: "8",
  "16th": "16",
  "32nd": "32",
  "64th": "64",
};

function getTabPositions(
  event: NoteEvent,
  tuning: Tuning,
  capo: number
): { str: number; fret: number }[] {
  switch (event.kind) {
    case "note": {
      const tab = event.tabInfo ?? event.head.tabInfo ?? pitchToTab(event.head.pitch, tuning);
      const fret = Math.max(0, tab.fret - capo);
      return [{ str: tab.string, fret }];
    }
    case "chord": {
      return event.heads.map((h) => {
        const tab = h.tabInfo ?? pitchToTab(h.pitch, tuning);
        const fret = Math.max(0, tab.fret - capo);
        return { str: tab.string, fret };
      });
    }
    case "rest":
    case "slash":
    case "grace":
      return [];
  }
}

/** Check if an event has a specific articulation */
function hasArticulation(event: NoteEvent, kind: Articulation["kind"]): boolean {
  if (event.kind !== "note" && event.kind !== "chord") return false;
  return event.articulations?.some((a) => a.kind === kind) ?? false;
}

function eventToTabNote(
  event: NoteEvent,
  tuning: Tuning,
  capo: number
): TabNote | GhostNote | null {
  const dur = DUR_VEX[event.duration.type];
  if (!dur) return null;

  if (event.kind === "rest") {
    return new GhostNote({ duration: dur });
  }

  const positions = getTabPositions(event, tuning, capo);
  if (positions.length === 0) return null;

  // Dead notes: render "X" on each string position
  const isDead = hasArticulation(event, "dead-note");
  // Ghost notes: render fret in parentheses
  const isGhost = hasArticulation(event, "ghost-note");

  let tabPositions: { str: number; fret: string | number }[];
  if (isDead) {
    tabPositions = positions.map((p) => ({ str: p.str, fret: "X" as unknown as number }));
  } else if (isGhost) {
    tabPositions = positions.map((p) => ({ str: p.str, fret: `(${p.fret})` as unknown as number }));
  } else {
    tabPositions = positions;
  }

  const tn = new TabNote({
    positions: tabPositions,
    duration: dur,
  });
  // Add articulations as modifiers
  if (event.kind === "note" || event.kind === "chord") {
    const articulations = event.articulations ?? [];
    for (const art of articulations) {
      addArticulationModifier(tn, art);
    }
  }

  return tn;
}

function bendLabel(semitones: number | undefined): string {
  if (semitones == null || isNaN(semitones)) return "Full";
  if (semitones === 1) return "½";
  if (semitones === 2) return "Full";
  if (semitones === 3) return "1½";
  return `${Math.floor(semitones / 2)}${semitones % 2 ? "½" : ""}`;
}

function addArticulationModifier(tn: TabNote, art: Articulation): void {
  switch (art.kind) {
    case "bend": {
      const bendText = bendLabel(art.semitones);
      const bend = new Bend([{ type: Bend.UP, text: bendText }]);
      tn.addModifier(bend);
      break;
    }
    case "pre-bend": {
      // VexFlow has no native pre-bend look — use bend arrow + "PB" marker
      // Renders same as bend visually but text distinguishes it
      const pb = new Bend([{ type: Bend.UP, text: bendLabel(art.semitones) }]);
      pb.setTap("PB");
      tn.addModifier(pb);
      break;
    }
    case "bend-release": {
      const br = new Bend([
        { type: Bend.UP, text: bendLabel(art.semitones) },
        { type: Bend.DOWN, text: "" },
      ]);
      tn.addModifier(br);
      break;
    }
    case "vibrato": {
      const vib = new Vibrato();
      tn.addModifier(vib);
      break;
    }
    case "tremolo-picking": {
      tn.addModifier(new Tremolo(3));
      break;
    }
    // All other techniques — handled by drawTabAnnotations() after VexFlow render
    // slide-up, slide-down, hammer-on, pull-off are handled as ties between notes
    // ghost-note, dead-note handled in eventToTabNote
    default:
      break;
  }
}

// On-staff text labels (Guitar Pro style: italic text on the top staff line)
const ON_STAFF_TEXTS: Record<string, string> = {
  "palm-mute": "P.M.",
  "harmonic": "N.H.",
  "let-ring": "let ring",
  "tapping": "T",
};
// Below-staff labels
const BELOW_STAFF_TEXTS: Record<string, string> = {
  "down-stroke": "П",   // down-pick (square-U shape, standard in tab)
  "up-stroke": "V",     // up-pick
  "fingerpick-p": "p",
  "fingerpick-i": "i",
  "fingerpick-m": "m",
  "fingerpick-a": "a",
};

// Custom post-render drawing — VexFlow annotations don't position correctly for tab
function drawTabAnnotations(
  ctx: RenderContext,
  events: NoteEvent[],
  tabNotes: (TabNote | GhostNote)[],
  stave: TabStave
): void {
  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  const prevFont = rawCtx.font;
  const prevFill = rawCtx.fillStyle;
  const prevStroke = rawCtx.strokeStyle;
  const prevLineWidth = rawCtx.lineWidth;

  const staveY = stave.getY();
  // Use VexFlow's actual line positions for accurate Y coordinates
  const line0Y = stave.getYForLine(0); // string 1 (top line)
  const onStaffTextY = line0Y - 10; // above first line with spacing
  const belowStaffY = staveY + TAB_STAFF_HEIGHT + 22;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.kind === "rest" || event.kind === "slash") continue;
    const tn = tabNotes[i];
    if (!tn || tn instanceof GhostNote) continue;

    const arts = event.articulations ?? [];
    const noteX = (tn as any).getAbsoluteX?.() ?? 0;
    if (noteX === 0) continue;

    // Get the note's string Y position for slide drawing
    // String 1 (high E) = line 0 (top), string 6 (low E) = line 5 (bottom)
    const positions = (tn as TabNote).getPositions?.() ?? [];
    const noteStringY = positions.length > 0
      ? stave.getYForLine(positions[0].str - 1)
      : stave.getYForLine(2.5); // fallback to center

    for (const art of arts) {
      // On-staff italic text (P.M., N.H., let ring, T)
      const onStaffText = ON_STAFF_TEXTS[art.kind];
      if (onStaffText) {
        rawCtx.font = "italic 10px sans-serif";
        rawCtx.fillStyle = typeof prevFill === "string" ? prevFill : INK;
        rawCtx.fillText(onStaffText, noteX - 4, onStaffTextY);
        continue;
      }

      // Below-staff text (strokes, fingerpicking)
      const belowText = BELOW_STAFF_TEXTS[art.kind];
      if (belowText) {
        const isFingerpick = art.kind.startsWith("fingerpick-");
        rawCtx.font = isFingerpick ? "italic 12px sans-serif" : "12px sans-serif";
        rawCtx.fillStyle = typeof prevFill === "string" ? prevFill : INK;
        rawCtx.fillText(belowText, noteX - 3, belowStaffY);
        continue;
      }

      // Slide-in: short diagonal line before the note at the note's string position
      // from-below: line goes ↗ into note, from-above: line goes ↘ into note
      if (art.kind === "slide-in-below" || art.kind === "slide-in-above") {
        rawCtx.strokeStyle = typeof prevStroke === "string" ? prevStroke : INK;
        rawCtx.lineWidth = 1.5;
        const endX = noteX - 3;
        const startX = endX - 12;
        const yOff = 6;
        rawCtx.beginPath();
        if (art.kind === "slide-in-below") {
          rawCtx.moveTo(startX, noteStringY + yOff);
          rawCtx.lineTo(endX, noteStringY - yOff);
        } else {
          rawCtx.moveTo(startX, noteStringY - yOff);
          rawCtx.lineTo(endX, noteStringY + yOff);
        }
        rawCtx.stroke();
        continue;
      }

      // Slide-out: short diagonal line after the note at the note's string position
      // out-above: line goes ↗ away, out-below: line goes ↘ away
      if (art.kind === "slide-out-below" || art.kind === "slide-out-above") {
        rawCtx.strokeStyle = typeof prevStroke === "string" ? prevStroke : INK;
        rawCtx.lineWidth = 1.5;
        const startX = noteX + 6;
        const endX = startX + 12;
        const yOff = 6;
        rawCtx.beginPath();
        if (art.kind === "slide-out-above") {
          rawCtx.moveTo(startX, noteStringY + yOff);
          rawCtx.lineTo(endX, noteStringY - yOff);
        } else {
          rawCtx.moveTo(startX, noteStringY - yOff);
          rawCtx.lineTo(endX, noteStringY + yOff);
        }
        rawCtx.stroke();
        continue;
      }
    }
  }

  rawCtx.font = prevFont;
  rawCtx.fillStyle = prevFill;
  rawCtx.strokeStyle = prevStroke;
  rawCtx.lineWidth = prevLineWidth;
}

/**
 * Render a measure as a tab staff.
 */
export function renderTabMeasure(
  ctx: RenderContext,
  m: Measure,
  x: number,
  y: number,
  width: number,
  showClef: boolean,
  tuning: Tuning = STANDARD_TUNING,
  partIndex = 0,
  measureIndex = 0,
  capo = 0,
  isTopStave = false,
  showTimeSig = false
): TabMeasureRenderResult {
  const stave = new TabStave(x, y, width);
  if (showClef) {
    stave.addClef("tab");
  }
  if (showTimeSig) {
    stave.addTimeSignature(`${m.timeSignature.numerator}/${m.timeSignature.denominator}`);
    // VexFlow's TimeSignature defaults to topLine=1, bottomLine=3 — centered
    // on line 2 (the middle of a 5-line staff). Shift so the two glyphs
    // straddle line 2.5, the visual center of our 6-line tab staff.
    // draw() uses (topLine - lineShift) and (bottomLine + lineShift) as the
    // actual y-lines; set topLine/bottomLine compensating for the internal
    // lineShift so the result is always lines 1.5 and 3.5.
    for (const mod of stave.getModifiers()) {
      if (mod.getCategory?.() === "TimeSignature") {
        const ts = mod as unknown as { topLine: number; bottomLine: number; lineShift: number };
        ts.topLine = 1.5 + ts.lineShift;
        ts.bottomLine = 3.5 - ts.lineShift;
        break;
      }
    }
  }

  // Barlines always show (structural); volta/segno only on topmost stave
  applyBarline(stave, m.barlineEnd);
  if (isTopStave) applyStaveDecorations(stave, m);

  // Extra left padding before the first note so fret digits don't crowd the
  // clef / time-sig / barline at the bar start.
  stave.setNoteStartX(stave.getNoteStartX() + TAB_NOTE_START_PADDING);

  // Draw the stave first at default line width, then re-stroke the 6 string
  // lines slightly thicker for better visual weight.
  if (capo > 0 && showClef) {
    stave.setContext(ctx.context);
    stave.draw();
    const rawCtx = ctx.context as unknown as { fillText(text: string, x: number, y: number): void; font: string };
    const prevFont = rawCtx.font;
    rawCtx.font = "italic 11px serif";
    rawCtx.fillText(`Capo ${capo}`, x + 6, y - 5);
    rawCtx.font = prevFont;
  } else {
    stave.setContext(ctx.context).draw();
  }
  {
    const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
    const prevLineWidth = rawCtx.lineWidth;
    const prevStroke = rawCtx.strokeStyle;
    rawCtx.lineWidth = TAB_LINE_WIDTH;
    rawCtx.strokeStyle = INK;
    const lineX0 = stave.getX();
    const lineX1 = lineX0 + stave.getWidth();
    for (let i = 0; i < 6; i++) {
      const yL = stave.getYForLine(i);
      rawCtx.beginPath();
      rawCtx.moveTo(lineX0, yL);
      rawCtx.lineTo(lineX1, yL);
      rawCtx.stroke();
    }
    rawCtx.lineWidth = prevLineWidth;
    rawCtx.strokeStyle = prevStroke;
  }

  // Draw coda, navigation text, tempo, rehearsal marks above stave
  if (isTopStave) drawStaveAnnotations(ctx, stave, m, x, y, width);

  const noteBoxes: NoteBox[] = [];
  const allTabNotes: (TabNote | GhostNote)[] = [];
  const matchedEvents: NoteEvent[] = []; // events that produced tab notes (1:1 with allTabNotes)
  const eventIds: NoteEventId[] = [];

  // Process first voice only for tab (tab is typically single-voice)
  const modelVoice = m.voices[0];
  if (!modelVoice || modelVoice.events.length === 0) {
    return { noteBoxes, staveY: y, staveX: x, width, vexStave: stave };
  }

  for (const event of modelVoice.events) {
    const tn = eventToTabNote(event, tuning, capo);
    if (tn) {
      allTabNotes.push(tn);
      matchedEvents.push(event);
      eventIds.push(event.id);
    }
  }

  if (allTabNotes.length > 0) {
    const totalTicks = modelVoice.events.reduce((sum, e) => {
      return sum + durationToTicksFn(e.duration);
    }, 0);
    const beats = totalTicks / 480;

    const vfVoice = new Voice({
      numBeats: beats,
      beatValue: 4,
    }).setStrict(false);
    vfVoice.addTickables(allTabNotes);

    const formatter = new Formatter();
    const formattingWidth = width - (stave.getNoteStartX() - x) - 10;
    formatter.format([vfVoice], Math.max(formattingWidth, 50));

    vfVoice.draw(ctx.context, stave);

    // Render slides and ties between consecutive notes
    renderTabConnections(ctx, matchedEvents, allTabNotes);

    // Draw above-staff text annotations and slide-in/out lines
    drawTabAnnotations(ctx, matchedEvents, allTabNotes, stave);

    // Render tied notes on tab staff
    for (let i = 0; i < matchedEvents.length - 1; i++) {
      const ev = matchedEvents[i];
      if (ev.kind === "note" && ev.head.tied) {
        const tn1 = allTabNotes[i];
        const tn2 = allTabNotes[i + 1];
        if (tn1 instanceof TabNote && tn2 instanceof TabNote) {
          try {
            new TabTie({ firstNote: tn1, lastNote: tn2 }).setContext(ctx.context).draw();
          } catch { /* skip if VexFlow rejects */ }
        }
      } else if (ev.kind === "chord") {
        const tiedIndices = ev.heads.map((h, idx) => h.tied ? idx : -1).filter(idx => idx >= 0);
        if (tiedIndices.length > 0) {
          const tn1 = allTabNotes[i];
          const tn2 = allTabNotes[i + 1];
          if (tn1 instanceof TabNote && tn2 instanceof TabNote) {
            // Draw a separate TabTie for each tied string. Without per-index
            // ties VexFlow only draws one arc for the whole chord — so the
            // user couldn't tell each string was tied.
            const dirByIdx = computeChordTieDirections(ev.heads, tiedIndices);
            for (const headIdx of tiedIndices) {
              try {
                const tie = new TabTie({
                  firstNote: tn1,
                  lastNote: tn2,
                  firstIndexes: [headIdx],
                  lastIndexes: [headIdx],
                });
                const dir = dirByIdx.get(headIdx);
                if (dir !== undefined) tie.setDirection(dir);
                tie.setContext(ctx.context).draw();
              } catch { /* skip if VexFlow rejects */ }
            }
          }
        }
      }
    }

    // Collect bounding boxes (skip GhostNotes — they have no visual)
    // VexFlow TabNote.getBoundingBox() returns y=0/h=0, so use stave position instead
    allTabNotes.forEach((tn, idx) => {
      if (tn instanceof GhostNote) return;
      const absX = (tn as any).getAbsoluteX?.() ?? stave.getNoteStartX();
      const noteWidth = 20; // reasonable click target width for tab numbers
      noteBoxes.push({
        id: eventIds[idx],
        x: absX - noteWidth / 2,
        y,
        width: noteWidth,
        height: TAB_STAFF_HEIGHT,
        headX: absX - noteWidth / 2,
        headY: y,
        headWidth: noteWidth,
        headHeight: TAB_STAFF_HEIGHT,
        partIndex,
        measureIndex,
        voiceIndex: 0,
        eventIndex: idx,
      });
    });

    // Render chord symbols above tab stave when it's the topmost stave
    if (isTopStave) {
      const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
      const chordAnns = m.annotations.filter((a): a is import("../model/annotations").ChordSymbol => a.kind === "chord-symbol");
      if (chordAnns.length > 0 && rawCtx.save) {
        rawCtx.save();
        rawCtx.font = "bold 14px sans-serif";
        rawCtx.fillStyle = INK;
        const chordY = y - 4;
        const renderedIds = new Set<string>();
        for (const ann of chordAnns) {
          if (ann.noteEventId && renderedIds.has(ann.noteEventId)) continue;
          const box = ann.noteEventId ? noteBoxes.find((nb) => nb.id === ann.noteEventId) : undefined;
          const chordX = box ? box.x : x + 4;
          rawCtx.fillText(ann.text, chordX, chordY);
          if (ann.noteEventId) renderedIds.add(ann.noteEventId);
        }
        rawCtx.restore();
      }
    }
  }

  // Build tab note map for cross-measure tie rendering
  const tabNoteMap = new Map<NoteEventId, TabNote>();
  allTabNotes.forEach((tn, idx) => {
    if (tn instanceof TabNote) tabNoteMap.set(eventIds[idx], tn);
  });

  return { noteBoxes, staveY: y, staveX: x, width, vexStave: stave, tabNoteMap };
}

/**
 * Render slide/hammer-on/pull-off connections between consecutive tab notes.
 */
function renderTabConnections(
  ctx: RenderContext,
  events: NoteEvent[],
  tabNotes: (TabNote | GhostNote)[]
): void {
  for (let i = 0; i < events.length - 1; i++) {
    const event = events[i];
    if (event.kind === "rest" || event.kind === "slash") continue;

    const articulations = event.articulations ?? [];
    for (const art of articulations) {
      if (art.kind === "slide-up" || art.kind === "slide-down") {
        try {
          const slide = new TabSlide({
            firstNote: tabNotes[i] as TabNote,
            lastNote: tabNotes[i + 1] as TabNote,
          }, art.kind === "slide-up"
            ? TabSlide.SLIDE_UP
            : TabSlide.SLIDE_DOWN);
          slide.setContext(ctx.context).draw();
        } catch {
          // Skip if VexFlow rejects the slide
        }
      } else if (art.kind === "hammer-on" || art.kind === "pull-off") {
        try {
          const tie = new TabTie({
            firstNote: tabNotes[i] as TabNote,
            lastNote: tabNotes[i + 1] as TabNote,
          }, art.kind === "hammer-on" ? "H" : "P");
          tie.setContext(ctx.context).draw();
        } catch {
          // Skip if VexFlow rejects the tie
        }
      }
    }
  }
}
