import { useRef, useEffect, useState } from "react";
import { useEditorStore } from "../state";
import { initRenderer } from "../renderer";
import { renderScore, calculateContentHeight } from "../renderer";
import { ScoreOverlay } from "./ScoreOverlay";

export function ScoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const score = useEditorStore((s) => s.score);
  const inputState = useEditorStore((s) => s.inputState);
  const setNoteBoxes = useEditorStore((s) => s.setNoteBoxes);
  const setMeasurePositions = useEditorStore((s) => s.setMeasurePositions);
  const playbackTick = useEditorStore((s) => s.playbackTick);
  const viewConfig = useEditorStore((s) => s.viewConfig);
  const selection = useEditorStore((s) => s.selection);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setContainerWidth(container.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Resize canvas + render in one pass
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth;
    const contentHeight = calculateContentHeight(score, viewConfig, width);
    const height = Math.max(contentHeight, container.clientHeight);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = initRenderer(canvas);

    // VexFlow's resize overwrites style dimensions — fix them after init
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    setCanvasHeight(height);

    const rawCtx = ctx.context as unknown as CanvasRenderingContext2D;
    if (rawCtx.scale) rawCtx.scale(dpr, dpr);

    const result = renderScore(ctx, canvas, score, inputState.cursor, playbackTick, viewConfig, width, selection);

    // Invert drawn content for dark mode, preserving transparency.
    const raw = canvas.getContext("2d")!;
    const imageData = raw.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    }
    raw.putImageData(imageData, 0, 0);

    setNoteBoxes(result.noteBoxes);
    setMeasurePositions(result.measurePositions);
  }, [score, inputState.cursor, playbackTick, viewConfig, containerWidth, selection, setNoteBoxes, setMeasurePositions]);

  return (
    <div
      ref={containerRef}
      data-score-container=""
      style={{ flex: 1, overflow: "auto", background: "#1e1e1e", minWidth: 0, position: "relative" }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <ScoreOverlay width={containerWidth} height={canvasHeight} />
    </div>
  );
}
