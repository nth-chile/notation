import type { Score, NoteEventId } from "../model";
import { TICKS_PER_QUARTER } from "../model/duration";
import { renderMeasure, renderMultiMeasureRest, renderSystemBarline, clearCanvas, type RenderContext, type NoteBox } from "./vexBridge";
import { renderTabMeasure } from "./TabRenderer";
import { computeLayout, totalContentHeight, totalPageCount, partStaveCount, DEFAULT_LAYOUT, type LayoutConfig } from "./SystemLayout";
import type { CursorPosition } from "../input/InputState";
import type { ViewConfig, AnnotationFilter } from "../views/ViewMode";
import type { Annotation } from "../model/annotations";
import type { Selection } from "../plugins/PluginAPI";
import type { Measure } from "../model";

/** Check if a measure contains only rests or empty voices (rendering-only check). */
function isMeasureAllRests(m: Measure): boolean {
  if (m.voices.length === 0) return true;
  return m.voices.every(v =>
    v.events.length === 0 || v.events.every(e => e.kind === "rest")
  );
}

/** Check if a measure has features that should break a multi-measure rest span. */
function breaksRestSpan(m: Measure): boolean {
  if (m.barlineEnd !== "single") return true;
  if (m.navigation?.segno || m.navigation?.coda || m.navigation?.volta) return true;
  if (m.navigation?.fine || m.navigation?.toCoda || m.navigation?.dsText || m.navigation?.dcText) return true;
  if (m.annotations.some(a => a.kind === "rehearsal-mark" || a.kind === "tempo-mark")) return true;
  return false;
}

/**
 * Detect runs of consecutive all-rest measures within a range.
 * Returns a map from measure index to the length of the rest run starting there.
 * Only runs of length > 1 are included.
 */
function detectRestRuns(
  measures: Measure[],
  startMeasure: number,
  endMeasure: number,
): Map<number, number> {
  const runs = new Map<number, number>();
  let mi = startMeasure;
  while (mi < endMeasure) {
    if (isMeasureAllRests(measures[mi]) && !breaksRestSpan(measures[mi])) {
      const runStart = mi;
      mi++;
      while (mi < endMeasure && isMeasureAllRests(measures[mi]) && !breaksRestSpan(measures[mi])) {
        mi++;
      }
      const runLength = mi - runStart;
      if (runLength > 1) {
        runs.set(runStart, runLength);
      }
    } else {
      mi++;
    }
  }
  return runs;
}

export interface ScoreRenderResult {
  noteBoxes: Map<NoteEventId, NoteBox>;
  measurePositions: { partIndex: number; measureIndex: number; x: number; y: number; width: number; height: number }[];
  contentHeight: number;
}

// Keep old constants exported for backward compatibility
const MEASURE_WIDTH = DEFAULT_LAYOUT.measureWidth;
const STAFF_HEIGHT = DEFAULT_LAYOUT.staffHeight + DEFAULT_LAYOUT.staffSpacing;
const LEFT_MARGIN = DEFAULT_LAYOUT.leftMargin;
const TOP_MARGIN = DEFAULT_LAYOUT.topMargin;
const MEASURES_PER_LINE = DEFAULT_LAYOUT.measuresPerLine;

function titleHeight(score: Score): number {
  const hasTitle = !!score.title;
  const hasComposer = !!score.composer;
  return (hasTitle ? 48 : 0) + (hasComposer ? 22 : 0) + (hasTitle || hasComposer ? 16 : 0);
}

export function calculateContentHeight(score: Score, viewConfig?: ViewConfig, availableWidth?: number): number {
  const width = availableWidth ?? 1000;
  const extra = titleHeight(score);
  if (!viewConfig) {
    return totalContentHeight(score, { ...DEFAULT_LAYOUT, adaptiveWidths: true, availableWidth: width, topMargin: DEFAULT_LAYOUT.topMargin + extra });
  }
  const visiblePartIndices = getVisiblePartIndices(score, viewConfig);
  const filteredScore = filterScoreParts(score, visiblePartIndices);
  const pageLayout = viewConfig.layoutConfig.pageLayout ?? false;
  const config: LayoutConfig = {
    ...DEFAULT_LAYOUT,
    adaptiveWidths: true,
    availableWidth: pageLayout ? DEFAULT_LAYOUT.pageWidth : width,
    topMargin: DEFAULT_LAYOUT.topMargin + extra,
    ...(viewConfig.layoutConfig.measuresPerLine != null
      ? { measuresPerLine: viewConfig.layoutConfig.measuresPerLine }
      : {}),
    ...(viewConfig.layoutConfig.compact
      ? { staffSpacing: 60 }
      : {}),
    ...(!viewConfig.layoutConfig.showPartNames ? { partLabelWidth: 0 } : {}),
    ...(pageLayout ? { pageBreaks: true } : {}),
  };
  return totalContentHeight(filteredScore, config);
}

export function renderScore(
  ctx: RenderContext,
  canvas: HTMLCanvasElement,
  score: Score,
  cursor?: CursorPosition,
  playbackTick?: number | null,
  viewConfig?: ViewConfig,
  availableWidth?: number,
  selection?: Selection | null
): ScoreRenderResult {
  clearCanvas(ctx, canvas);

  // Determine which parts to render based on viewConfig
  const visiblePartIndices = getVisiblePartIndices(score, viewConfig);
  const annotationFilter = viewConfig?.showAnnotations;
  const showPartNames = viewConfig?.layoutConfig.showPartNames ?? true;
  const isSongwriterMode = viewConfig?.type === "songwriter";

  // Build a filtered score for layout computation
  const filteredScore = filterScoreParts(score, visiblePartIndices);

  const effectiveWidth = availableWidth ?? canvas.width / (window.devicePixelRatio || 1);
  const pageLayoutEnabled = viewConfig?.layoutConfig.pageLayout ?? false;
  let config: LayoutConfig = {
    ...DEFAULT_LAYOUT,
    adaptiveWidths: true,
    availableWidth: pageLayoutEnabled ? DEFAULT_LAYOUT.pageWidth : effectiveWidth,
    ...(viewConfig?.layoutConfig.measuresPerLine != null
      ? { measuresPerLine: viewConfig.layoutConfig.measuresPerLine }
      : {}),
    ...(viewConfig?.layoutConfig.compact
      ? { staffSpacing: 60 }
      : {}),
    ...(!showPartNames ? { partLabelWidth: 0 } : {}),
    ...(pageLayoutEnabled ? { pageBreaks: true } : {}),
  };
  // Add space for title/composer above the first system
  const hasTitle = !!score.title;
  const hasComposer = !!score.composer;
  const titleHeight = (hasTitle ? 48 : 0) + (hasComposer ? 22 : 0) + (hasTitle || hasComposer ? 16 : 0);
  config = { ...config, topMargin: config.topMargin + titleHeight };

  const systems = computeLayout(filteredScore, config);

  const allNoteBoxes = new Map<NoteEventId, NoteBox>();
  const measurePositions: ScoreRenderResult["measurePositions"] = [];

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;

  // Draw page backgrounds and boundaries when page layout is active
  if (pageLayoutEnabled && rawCtx.save) {
    const pages = totalPageCount(filteredScore, config);
    rawCtx.save();
    for (let p = 0; p < pages; p++) {
      const pageTop = p * config.pageHeight;
      // White page background
      rawCtx.fillStyle = "#ffffff";
      const pageX = pageLayoutEnabled ? (effectiveWidth - config.pageWidth) / 2 : 0;
      rawCtx.fillRect(Math.max(pageX, 0), pageTop, config.pageWidth, config.pageHeight);

      // Page boundary line at the bottom of each page (except the last)
      if (p < pages - 1) {
        rawCtx.strokeStyle = "#cccccc";
        rawCtx.lineWidth = 1;
        rawCtx.setLineDash([4, 4]);
        rawCtx.beginPath();
        rawCtx.moveTo(0, pageTop + config.pageHeight);
        rawCtx.lineTo(effectiveWidth, pageTop + config.pageHeight);
        rawCtx.stroke();
      }
    }
    rawCtx.setLineDash([]);
    rawCtx.restore();
  }

  // Render title and composer (only on first page)
  if (rawCtx.save && (hasTitle || hasComposer)) {
    rawCtx.save();
    rawCtx.textAlign = "center";
    const centerX = pageLayoutEnabled ? config.pageWidth / 2 : effectiveWidth / 2;
    let y = DEFAULT_LAYOUT.topMargin;

    if (hasTitle) {
      rawCtx.font = "bold 32px 'Times New Roman', 'Georgia', serif";
      rawCtx.fillStyle = getComputedStyle(rawCtx.canvas).getPropertyValue("color") || "#000";
      rawCtx.fillText(score.title, centerX, y);
      y += 38;
    }
    if (hasComposer) {
      rawCtx.font = "italic 15px 'Times New Roman', 'Georgia', serif";
      rawCtx.fillStyle = getComputedStyle(rawCtx.canvas).getPropertyValue("color") || "#555";
      rawCtx.fillText(score.composer, centerX, y);
    }
    rawCtx.textAlign = "start";
    rawCtx.restore();
  }

  for (const system of systems) {
    const isFirstSystem = system.lineIndex === 0;

    // Render each visible part's measures in this system
    for (let filteredPi = 0; filteredPi < filteredScore.parts.length; filteredPi++) {
      const originalPi = visiblePartIndices[filteredPi];
      const part = filteredScore.parts[filteredPi];
      const staveCount = partStaveCount(filteredScore, filteredPi);
      const useTab = viewConfig?.staffType[originalPi] === "tab";

      // Detect consecutive rest measure runs for multi-measure rest rendering
      const restRuns = detectRestRuns(part.measures, system.startMeasure, system.endMeasure);

      for (let si = 0; si < staveCount; si++) {
        const staveLayouts = system.staves.filter(
          (s) => s.partIndex === filteredPi && s.staveIndex === si
        );

        let mi = system.startMeasure;
        while (mi < system.endMeasure) {
          const m = part.measures[mi];
          if (!m) { mi++; continue; }

          const posInLine = mi - system.startMeasure;
          const isFirstInLine = posInLine === 0;
          const layout = staveLayouts[posInLine];
          if (!layout) { mi++; continue; }

          // Check for multi-measure rest run starting at this measure
          const restRunLength = restRuns.get(mi);
          if (restRunLength && !useTab) {
            // Combine widths of all measures in the rest run
            let combinedWidth = 0;
            for (let r = 0; r < restRunLength; r++) {
              const rl = staveLayouts[posInLine + r];
              if (rl) combinedWidth += rl.width;
            }

            let measureToRender = m;
            if (staveCount === 2 && si === 1) {
              measureToRender = { ...measureToRender, clef: { type: "bass" as const } };
            }

            renderMultiMeasureRest(
              ctx,
              measureToRender,
              layout.x,
              layout.y,
              combinedWidth,
              restRunLength,
              isFirstInLine,
              isFirstInLine,
            );

            // Add measure positions for all measures in the run (for cursor/selection)
            if (si === 0) {
              for (let r = 0; r < restRunLength; r++) {
                const rl = staveLayouts[posInLine + r];
                if (rl) {
                  measurePositions.push({
                    partIndex: originalPi,
                    measureIndex: mi + r,
                    x: layout.x,
                    y: layout.y,
                    width: combinedWidth,
                    height: config.staffHeight,
                  });
                }
              }
            }

            mi += restRunLength;
            continue;
          }

          // Filter annotations based on viewConfig
          let measureToRender = m;
          if (annotationFilter) {
            measureToRender = {
              ...m,
              annotations: filterAnnotations(m.annotations, annotationFilter),
            };
          }

          // For grand staff, determine the clef for this stave
          if (staveCount === 2 && si === 1) {
            measureToRender = { ...measureToRender, clef: { type: "bass" as const } };
          }

          let result;
          if (useTab && si === 0) {
            // Render as tab staff
            result = renderTabMeasure(
              ctx,
              measureToRender,
              layout.x,
              layout.y,
              layout.width,
              isFirstInLine,
              undefined,
              originalPi,
              mi
            );
          } else {
            result = renderMeasure(
              ctx,
              measureToRender,
              layout.x,
              layout.y,
              layout.width,
              isFirstInLine,
              mi === 0,
              isFirstInLine,
              score.stylesheet,
              originalPi,
              mi
            );
          }

          // Only add to measurePositions for the primary stave (staveIndex 0)
          if (si === 0) {
            measurePositions.push({
              partIndex: originalPi,
              measureIndex: mi,
              x: layout.x,
              y: layout.y,
              width: layout.width,
              height: config.staffHeight,
            });
          }

          for (const nb of result.noteBoxes) {
            allNoteBoxes.set(nb.id, nb);
          }

          // In songwriter mode, render chord symbols larger above the staff
          if (isSongwriterMode && si === 0) {
            renderSongwriterChords(rawCtx, measureToRender, layout.x, layout.y, layout.width);
          }

          mi++;
        }
      }
    }

    // Draw part names on the left
    if (rawCtx.save && showPartNames) {
      for (let filteredPi = 0; filteredPi < filteredScore.parts.length; filteredPi++) {
        const part = filteredScore.parts[filteredPi];
        const staveLayouts = system.staves.filter(
          (s) => s.partIndex === filteredPi && s.staveIndex === 0
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
      if (filteredScore.parts.length > 1) {
        const firstPartStaves = system.staves.filter(
          (s) => s.partIndex === 0 && s.staveIndex === 0
        );
        const lastPartIndex = filteredScore.parts.length - 1;
        const lastStaveIdx = partStaveCount(filteredScore, lastPartIndex) - 1;
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

  // Draw selection highlight
  if (selection) {
    drawSelection(rawCtx, selection, measurePositions, config);
  }

  // Draw cursor
  if (cursor) {
    drawCursor(ctx, score, cursor, measurePositions, config, allNoteBoxes);
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
  config: LayoutConfig,
  noteBoxes?: Map<NoteEventId, NoteBox>
): void {
  const mp = measurePositions.find(
    (p) => p.partIndex === cursor.partIndex && p.measureIndex === cursor.measureIndex
  );
  if (!mp) return;

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (!rawCtx.strokeStyle) return;

  // Try to find the actual noteBox at the cursor position
  let targetBox: NoteBox | undefined;
  if (noteBoxes) {
    const voice = score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
    if (voice && cursor.eventIndex < voice.events.length) {
      const eventId = voice.events[cursor.eventIndex].id;
      targetBox = noteBoxes.get(eventId);
    }
  }

  if (targetBox) {
    // Highlight the note with a rounded rect
    rawCtx.save();
    rawCtx.strokeStyle = "#da9c14";
    rawCtx.lineWidth = 2;
    const pad = 3;
    const rx = targetBox.x - pad;
    const ry = targetBox.y - pad;
    const rw = targetBox.width + pad * 2;
    const rh = targetBox.height + pad * 2;
    const r = 4;
    rawCtx.beginPath();
    rawCtx.rect(rx, ry, rw, rh);
    rawCtx.stroke();

    // Also draw the cursor line at the note's x position
    rawCtx.setLineDash([4, 4]);
    rawCtx.beginPath();
    rawCtx.moveTo(targetBox.x + targetBox.width / 2, mp.y);
    rawCtx.lineTo(targetBox.x + targetBox.width / 2, mp.y + config.staffHeight);
    rawCtx.stroke();
    rawCtx.restore();
  } else {
    // Fallback: draw cursor line at end of measure (for append position)
    const voice = score.parts[cursor.partIndex]?.measures[cursor.measureIndex]?.voices[cursor.voiceIndex];
    const eventCount = voice?.events.length ?? 0;

    // Find the last noteBox in this measure to position after it
    let cursorX = mp.x + 60;
    if (noteBoxes && voice) {
      for (let i = eventCount - 1; i >= 0; i--) {
        const nb = noteBoxes.get(voice.events[i].id);
        if (nb) {
          cursorX = nb.x + nb.width + 10;
          break;
        }
      }
    }

    rawCtx.save();
    rawCtx.strokeStyle = "#da9c14";
    rawCtx.lineWidth = 2;
    rawCtx.setLineDash([4, 4]);
    rawCtx.beginPath();
    rawCtx.moveTo(cursorX, mp.y);
    rawCtx.lineTo(cursorX, mp.y + config.staffHeight);
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
    rawCtx.strokeStyle = "#ef467e";
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

function drawSelection(
  rawCtx: CanvasRenderingContext2D,
  selection: Selection,
  measurePositions: ScoreRenderResult["measurePositions"],
  config: LayoutConfig
): void {
  rawCtx.save();
  rawCtx.fillStyle = "rgba(66, 133, 244, 0.15)";
  for (const mp of measurePositions) {
    if (
      mp.partIndex === selection.partIndex &&
      mp.measureIndex >= selection.measureStart &&
      mp.measureIndex <= selection.measureEnd
    ) {
      rawCtx.fillRect(mp.x, mp.y, mp.width, config.staffHeight);
    }
  }
  rawCtx.restore();
}

/**
 * Get the list of visible part indices based on view config.
 */
function getVisiblePartIndices(score: Score, viewConfig?: ViewConfig): number[] {
  if (!viewConfig || viewConfig.partsToShow === "all") {
    return score.parts.map((_, i) => i);
  }
  return viewConfig.partsToShow.filter((i) => i < score.parts.length);
}

/**
 * Build a filtered score containing only the visible parts.
 */
function filterScoreParts(score: Score, visiblePartIndices: number[]): Score {
  if (visiblePartIndices.length === score.parts.length) {
    return score;
  }
  return {
    ...score,
    parts: visiblePartIndices.map((i) => score.parts[i]),
  };
}

/**
 * Filter annotations based on allowed kinds.
 */
function filterAnnotations(
  annotations: Annotation[],
  allowedKinds: AnnotationFilter[]
): Annotation[] {
  return annotations.filter((a) => allowedKinds.includes(a.kind as AnnotationFilter));
}

/**
 * Render chord symbols with larger, more prominent text for songwriter mode.
 */
function renderSongwriterChords(
  rawCtx: CanvasRenderingContext2D,
  m: { annotations: Annotation[] },
  x: number,
  y: number,
  _width: number
): void {
  if (!rawCtx.save) return;
  const chords = m.annotations.filter((a) => a.kind === "chord-symbol");
  if (chords.length === 0) return;

  // Songwriter mode already renders chord symbols via the normal path,
  // but we draw an additional larger overlay
  // This is handled by the stylesheet override, so nothing extra needed here.
}

export { MEASURE_WIDTH, STAFF_HEIGHT, LEFT_MARGIN, TOP_MARGIN, MEASURES_PER_LINE };
