import type { Score, NoteEventId } from "../model";
import { TICKS_PER_QUARTER } from "../model/duration";
import { renderMeasure, renderSystemBarline, clearCanvas, type RenderContext, type NoteBox } from "./vexBridge";
import { computeLayout, totalContentHeight, partStaveCount, DEFAULT_LAYOUT, type LayoutConfig } from "./SystemLayout";
import type { CursorPosition } from "../input/InputState";

export interface ScoreRenderResult {
  noteBoxes: Map<NoteEventId, NoteBox>;
  measurePositions: { partIndex: number; measureIndex: number; x: number; y: number; width: number }[];
  contentHeight: number;
}

// Keep old constants exported for backward compatibility
const MEASURE_WIDTH = DEFAULT_LAYOUT.measureWidth;
const STAFF_HEIGHT = DEFAULT_LAYOUT.staffHeight + DEFAULT_LAYOUT.staffSpacing;
const LEFT_MARGIN = DEFAULT_LAYOUT.leftMargin;
const TOP_MARGIN = DEFAULT_LAYOUT.topMargin;
const MEASURES_PER_LINE = DEFAULT_LAYOUT.measuresPerLine;

export function calculateContentHeight(score: Score): number {
  return totalContentHeight(score, DEFAULT_LAYOUT);
}

export function renderScore(
  ctx: RenderContext,
  canvas: HTMLCanvasElement,
  score: Score,
  cursor?: CursorPosition,
  playbackTick?: number | null
): ScoreRenderResult {
  clearCanvas(ctx, canvas);

  const config: LayoutConfig = DEFAULT_LAYOUT;
  const systems = computeLayout(score, config);

  const allNoteBoxes = new Map<NoteEventId, NoteBox>();
  const measurePositions: ScoreRenderResult["measurePositions"] = [];

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;

  for (const system of systems) {
    const isFirstSystem = system.lineIndex === 0;

    // Render each part's measures in this system
    for (let pi = 0; pi < score.parts.length; pi++) {
      const part = score.parts[pi];
      const staveCount = partStaveCount(score, pi);

      for (let si = 0; si < staveCount; si++) {
        for (let mi = system.startMeasure; mi < system.endMeasure; mi++) {
          const m = part.measures[mi];
          if (!m) continue;

          const posInLine = mi - system.startMeasure;
          const isFirstInLine = posInLine === 0;

          // Calculate position from stave layouts
          const staveLayouts = system.staves.filter(
            (s) => s.partIndex === pi && s.staveIndex === si
          );
          const layout = staveLayouts[posInLine];
          if (!layout) continue;

          // For grand staff, determine the clef for this stave
          let measureToRender = m;
          if (staveCount === 2 && si === 1) {
            // Bass staff of grand staff - override clef to bass
            measureToRender = { ...m, clef: { type: "bass" as const } };
          }

          const result = renderMeasure(
            ctx,
            measureToRender,
            layout.x,
            layout.y,
            layout.width,
            isFirstInLine,
            mi === 0,
            isFirstInLine,
            score.stylesheet
          );

          // Only add to measurePositions for the primary stave (staveIndex 0)
          if (si === 0) {
            measurePositions.push({
              partIndex: pi,
              measureIndex: mi,
              x: layout.x,
              y: layout.y,
              width: layout.width,
            });
          }

          for (const nb of result.noteBoxes) {
            allNoteBoxes.set(nb.id, nb);
          }
        }
      }
    }

    // Draw part names on the left
    if (rawCtx.save) {
      for (let pi = 0; pi < score.parts.length; pi++) {
        const part = score.parts[pi];
        const staveLayouts = system.staves.filter(
          (s) => s.partIndex === pi && s.staveIndex === 0
        );
        if (staveLayouts.length === 0) continue;

        const firstStave = staveLayouts[0];
        const labelX = config.leftMargin;
        const labelY = firstStave.y + config.staffHeight / 2 + 4;

        rawCtx.save();
        rawCtx.font = isFirstSystem ? "bold 11px sans-serif" : "10px sans-serif";
        rawCtx.fillStyle = "#333";
        rawCtx.textAlign = "left";
        rawCtx.fillText(
          isFirstSystem ? part.name : part.abbreviation,
          labelX,
          labelY
        );
        rawCtx.textAlign = "start";
        rawCtx.restore();
      }

      // Draw system barlines (vertical line connecting all staves at the start of each system)
      if (score.parts.length > 1) {
        const firstPartStaves = system.staves.filter(
          (s) => s.partIndex === 0 && s.staveIndex === 0
        );
        const lastPartIndex = score.parts.length - 1;
        const lastStaveIdx = partStaveCount(score, lastPartIndex) - 1;
        const lastPartStaves = system.staves.filter(
          (s) => s.partIndex === lastPartIndex && s.staveIndex === lastStaveIdx
        );

        if (firstPartStaves.length > 0 && lastPartStaves.length > 0) {
          const topY = firstPartStaves[0].y;
          const bottomY = lastPartStaves[0].y + config.staffHeight;
          const barlineX = firstPartStaves[0].x;

          renderSystemBarline(ctx, barlineX, topY, bottomY);
        }
      }
    }
  }

  // Draw cursor
  if (cursor) {
    drawCursor(ctx, score, cursor, measurePositions, config);
  }

  // Draw playback cursor
  if (playbackTick != null && playbackTick >= 0) {
    drawPlaybackCursor(ctx, score, playbackTick, measurePositions, config);
  }

  const contentHeight = totalContentHeight(score, config);

  return { noteBoxes: allNoteBoxes, measurePositions, contentHeight };
}

function drawCursor(
  ctx: RenderContext,
  score: Score,
  cursor: CursorPosition,
  measurePositions: ScoreRenderResult["measurePositions"],
  config: LayoutConfig
): void {
  const mp = measurePositions.find(
    (p) => p.partIndex === cursor.partIndex && p.measureIndex === cursor.measureIndex
  );
  if (!mp) return;

  const voice = score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
  if (!voice) return;

  const eventCount = voice.events.length;
  const usableWidth = mp.width - 60;
  const eventSpacing = eventCount > 0 ? usableWidth / (eventCount + 1) : usableWidth / 2;
  const cursorX = mp.x + 60 + cursor.eventIndex * eventSpacing;

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (rawCtx.strokeStyle !== undefined) {
    rawCtx.save();
    rawCtx.strokeStyle = "#2563eb";
    rawCtx.lineWidth = 2;
    rawCtx.setLineDash([4, 4]);
    rawCtx.beginPath();
    rawCtx.moveTo(cursorX, mp.y + 10);
    rawCtx.lineTo(cursorX, mp.y + config.staffHeight - 10);
    rawCtx.stroke();
    rawCtx.restore();
  }
}

function drawPlaybackCursor(
  ctx: RenderContext,
  score: Score,
  playbackTick: number,
  measurePositions: ScoreRenderResult["measurePositions"],
  config: LayoutConfig
): void {
  const part = score.parts[0];
  if (!part) return;

  let accumulated = 0;
  let targetMeasureIndex = 0;
  let tickInMeasure = 0;

  for (let mi = 0; mi < part.measures.length; mi++) {
    const ts = part.measures[mi].timeSignature;
    const measureTicks =
      (TICKS_PER_QUARTER * 4 * ts.numerator) / ts.denominator;
    if (accumulated + measureTicks > playbackTick) {
      targetMeasureIndex = mi;
      tickInMeasure = playbackTick - accumulated;
      break;
    }
    accumulated += measureTicks;
    if (mi === part.measures.length - 1) {
      targetMeasureIndex = mi;
      tickInMeasure = measureTicks;
    }
  }

  const mp = measurePositions.find(
    (p) => p.partIndex === 0 && p.measureIndex === targetMeasureIndex
  );
  if (!mp) return;

  const ts = part.measures[targetMeasureIndex].timeSignature;
  const measureTicks =
    (TICKS_PER_QUARTER * 4 * ts.numerator) / ts.denominator;
  const fraction = Math.min(tickInMeasure / measureTicks, 1);
  const usableWidth = mp.width - 60;
  const cursorX = mp.x + 60 + fraction * usableWidth;

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (rawCtx.strokeStyle !== undefined) {
    rawCtx.save();
    rawCtx.strokeStyle = "#10b981";
    rawCtx.lineWidth = 2.5;
    rawCtx.setLineDash([]);
    rawCtx.globalAlpha = 0.8;
    rawCtx.beginPath();
    rawCtx.moveTo(cursorX, mp.y + 10);
    rawCtx.lineTo(cursorX, mp.y + config.staffHeight - 10);
    rawCtx.stroke();
    rawCtx.restore();
  }
}

export { MEASURE_WIDTH, STAFF_HEIGHT, LEFT_MARGIN, TOP_MARGIN, MEASURES_PER_LINE };
