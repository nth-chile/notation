import { useState, useEffect, useCallback } from "react";
import { getSnapshots } from "../fileio/history";
import { deserialize } from "../serialization";
import { useEditorStore } from "../state";

interface Snapshot {
  id?: number;
  timestamp: number;
  scoreJson: string;
  title: string;
}

/** Call this to open the history modal from anywhere. */
export function showHistoryModal(): void {
  window.dispatchEvent(new CustomEvent("notation:show-history"));
}

export function HistoryModal() {
  const [visible, setVisible] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const open = useCallback(async () => {
    setVisible(true);
    setLoading(true);
    const snaps = await getSnapshots();
    setSnapshots(snaps);
    setLoading(false);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const handler = () => open();
    window.addEventListener("notation:show-history", handler);
    return () => window.removeEventListener("notation:show-history", handler);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, close]);

  const restore = useCallback(
    (snap: Snapshot) => {
      try {
        const score = deserialize(snap.scoreJson);
        useEditorStore.getState().setScore(score);
        close();
      } catch (err) {
        console.error("Failed to restore snapshot:", err);
      }
    },
    [close]
  );

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center pt-24 z-[1100]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="File History"
      aria-describedby="history-modal-desc"
    >
      <div
        className="bg-popover border rounded-lg w-[440px] max-h-[480px] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b text-sm font-semibold">
          File History
        </div>
        <p id="history-modal-desc" className="sr-only">
          Browse and restore previous versions of your score.
        </p>
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="py-5 px-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
          {!loading && snapshots.length === 0 && (
            <div className="py-5 px-4 text-center text-sm text-muted-foreground">
              No history yet
            </div>
          )}
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="px-4 py-2.5 cursor-pointer hover:bg-accent/50 flex justify-between items-center border-b border-border/50"
              onClick={() => restore(snap)}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">{snap.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(snap.timestamp)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatRelative(snap.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
