import { exportToMusicXML } from "../musicxml";
import type { Score } from "../model";

export async function saveScore(score: Score, filePath?: string): Promise<string> {
  const content = exportToMusicXML(score);

  // Try Tauri native file dialog
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const path =
      filePath ??
      (await save({
        filters: [{ name: "MusicXML", extensions: ["musicxml"] }],
        defaultPath: `${score.title || "Untitled"}.musicxml`,
      }));

    if (!path) throw new Error("Save cancelled");

    await writeTextFile(path, content);
    return path;
  } catch {
    // Fallback: browser download
    const blob = new Blob([content], { type: "application/vnd.recordare.musicxml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.title || "Untitled"}.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
    return a.download;
  }
}
