import { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "../state";
import { initRenderer, type RenderContext } from "../renderer";
import { renderScore } from "../renderer";

export function ScoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<RenderContext | null>(null);

  const score = useEditorStore((s) => s.score);
  const inputState = useEditorStore((s) => s.inputState);
  const setNoteBoxes = useEditorStore((s) => s.setNoteBoxes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!ctxRef.current) {
      ctxRef.current = initRenderer(canvas);
    }

    const result = renderScore(ctxRef.current, canvas, score, inputState.cursor);
    setNoteBoxes(result.noteBoxes);
  }, [score, inputState.cursor, setNoteBoxes]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Reinitialize renderer on resize
    ctxRef.current = initRenderer(canvas);
    const ctx = ctxRef.current.context as unknown as CanvasRenderingContext2D;
    if (ctx.scale) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block" }}
      />
    </div>
  );
}
