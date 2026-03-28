import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "../state";
import { initRenderer, type RenderContext } from "../renderer";
import { renderScore, calculateContentHeight } from "../renderer";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function ScoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<RenderContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const score = useEditorStore((s) => s.score);
  const inputState = useEditorStore((s) => s.inputState);
  const setNoteBoxes = useEditorStore((s) => s.setNoteBoxes);
  const playbackTick = useEditorStore((s) => s.playbackTick);
  const viewConfig = useEditorStore((s) => s.viewConfig);
  const viewMode = useEditorStore((s) => s.viewMode);
  const viewScrollPositions = useEditorStore((s) => s.viewScrollPositions);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = container.clientWidth / zoom;
    const contentHeight = calculateContentHeight(score, viewConfig);
    const canvasHeight = Math.max(contentHeight, container.clientHeight / zoom);

    canvas.width = containerWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctxRef.current = initRenderer(canvas);
    const ctx = ctxRef.current.context as unknown as CanvasRenderingContext2D;
    if (ctx.scale) {
      ctx.scale(dpr, dpr);
    }
  }, [score, viewConfig, zoom]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;

    const result = renderScore(ctxRef.current, canvas, score, inputState.cursor, playbackTick, viewConfig);
    setNoteBoxes(result.noteBoxes);
  }, [score, inputState.cursor, setNoteBoxes, playbackTick, viewConfig, zoom]);

  // Pinch-to-zoom and Ctrl+scroll zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Restore scroll position when view mode changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const savedScroll = viewScrollPositions[viewMode] ?? 0;
    container.scrollTop = savedScroll;
  }, [viewMode, viewScrollPositions]);

  // Keyboard zoom: Ctrl+= / Ctrl+- / Ctrl+0
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      } else if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        // Only handle Ctrl+- for zoom, not bare - (accidental)
        e.preventDefault();
        setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={styles.zoomBar}>
        <button
          style={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          title="Zoom out (Ctrl+-)"
        >
          −
        </button>
        <span style={styles.zoomLabel}>{zoomPercent}%</span>
        <button
          style={styles.zoomBtn}
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          title="Zoom in (Ctrl+=)"
        >
          +
        </button>
        <button
          style={{ ...styles.zoomBtn, fontSize: 10, padding: "2px 6px" }}
          onClick={() => setZoom(1)}
          title="Reset zoom (Ctrl+0)"
        >
          Reset
        </button>
      </div>
      <div
        ref={containerRef}
        data-score-container=""
        style={{ flex: 1, overflow: "auto", background: "#fff" }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zoomBar: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 12px",
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    flexShrink: 0,
  },
  zoomBtn: {
    padding: "2px 8px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 3,
    background: "#fff",
    cursor: "pointer",
    lineHeight: 1,
  },
  zoomLabel: {
    fontSize: 11,
    color: "#64748b",
    minWidth: 36,
    textAlign: "center" as const,
  },
};
