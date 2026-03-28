import { deserialize } from "../serialization";
import { importFromMusicXML } from "../musicxml";
import type { Score } from "../model";

function isMusicXML(content: string): boolean {
  const trimmed = content.trimStart();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<score-partwise")
  );
}

function isMusicXMLExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".musicxml") || lower.endsWith(".xml");
}

function parseContent(content: string, filename: string): Score {
  if (isMusicXMLExtension(filename) || isMusicXML(content)) {
    return importFromMusicXML(content);
  }
  return deserialize(content);
}

export async function loadScore(): Promise<{ score: Score; path: string } | null> {
  // Try Tauri native file dialog
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const path = await open({
      filters: [
        { name: "All Supported", extensions: ["notation", "musicxml", "xml"] },
        { name: "Notation", extensions: ["notation"] },
        { name: "MusicXML", extensions: ["musicxml", "xml"] },
      ],
      multiple: false,
    });

    if (!path) return null;

    const content = await readTextFile(path as string);
    const score = parseContent(content, path as string);
    return { score, path: path as string };
  } catch {
    // Fallback: browser file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".notation,.musicxml,.xml";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const text = await file.text();
        const score = parseContent(text, file.name);
        resolve({ score, path: file.name });
      };
      input.click();
    });
  }
}
