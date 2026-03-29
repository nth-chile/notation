import type { Score } from "../model/score";
import { initRenderer } from "../renderer/vexBridge";
import { renderScore } from "../renderer/ScoreRenderer";
import { computeLayout, totalPageCount, DEFAULT_LAYOUT, type LayoutConfig } from "../renderer/SystemLayout";
import { fullScoreConfig, type ViewConfig } from "../views/ViewMode";
import { jsPDF } from "jspdf";

/** Scale factor for print resolution (300dpi / 96dpi) */
const PRINT_SCALE = 300 / 96;

/**
 * Export the score as a multi-page PDF and trigger a browser download.
 * When a viewConfig is provided, it is used to filter which parts are rendered.
 */
export async function exportPDF(score: Score, viewConfig?: ViewConfig): Promise<void> {
  const baseConfig = viewConfig ?? fullScoreConfig();
  const effectiveConfig = {
    ...baseConfig,
    layoutConfig: {
      ...baseConfig.layoutConfig,
      pageLayout: true,
    },
  };

  // Alias for use below
  const viewCfg = effectiveConfig;

  const pageWidth = DEFAULT_LAYOUT.pageWidth;
  const pageHeight = DEFAULT_LAYOUT.pageHeight;

  // Build the layout config matching what renderScore will use
  const hasTitle = !!score.title;
  const hasComposer = !!score.composer;
  const titleExtra = (hasTitle ? 48 : 0) + (hasComposer ? 22 : 0) + (hasTitle || hasComposer ? 16 : 0);

  const layoutConfig: LayoutConfig = {
    ...DEFAULT_LAYOUT,
    adaptiveWidths: true,
    availableWidth: pageWidth,
    pageBreaks: true,
    topMargin: DEFAULT_LAYOUT.topMargin + titleExtra,
  };

  const pages = totalPageCount(score, layoutConfig);

  // Create an offscreen canvas at print resolution
  const canvas = document.createElement("canvas");
  const scaledWidth = Math.round(pageWidth * PRINT_SCALE);
  const scaledHeight = Math.round(pageHeight * pages * PRINT_SCALE);
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  canvas.style.width = `${pageWidth}px`;
  canvas.style.height = `${pageHeight * pages}px`;

  const ctx = initRenderer(canvas);

  // Fix style dimensions after VexFlow init
  canvas.style.width = `${pageWidth}px`;
  canvas.style.height = `${pageHeight * pages}px`;

  const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
  if (rawCtx.scale) rawCtx.scale(PRINT_SCALE, PRINT_SCALE);

  // Render the score with page layout (using the effective view config)
  renderScore(ctx, canvas, score, undefined, null, viewCfg, pageWidth);

  // Create PDF (US Letter: 8.5 x 11 inches)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
  });

  for (let p = 0; p < pages; p++) {
    if (p > 0) pdf.addPage();

    // Extract this page's region from the canvas
    const pageCanvas = document.createElement("canvas");
    const pw = scaledWidth;
    const ph = Math.round(pageHeight * PRINT_SCALE);
    pageCanvas.width = pw;
    pageCanvas.height = ph;

    const pageCtx = pageCanvas.getContext("2d")!;
    pageCtx.drawImage(
      canvas,
      0, p * ph, pw, ph, // source rect
      0, 0, pw, ph       // dest rect
    );

    const imgData = pageCanvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, 8.5, 11);
  }

  // Build filename: include part name when exporting a single part
  const partsSuffix =
    viewCfg.partsToShow !== "all" && viewCfg.partsToShow.length === 1
      ? ` - ${score.parts[viewCfg.partsToShow[0]]?.name ?? "Part"}`
      : "";
  pdf.save(`${score.title || "Untitled"}${partsSuffix}.pdf`);
}

/**
 * Export a single part from the score as a PDF.
 */
export async function exportPartPDF(score: Score, partIndex: number): Promise<void> {
  const config: ViewConfig = {
    ...fullScoreConfig(),
    partsToShow: [partIndex],
  };
  return exportPDF(score, config);
}
