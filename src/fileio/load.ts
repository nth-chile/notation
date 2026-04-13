import { importFromMusicXML, type MusicXMLImportResult } from "../musicxml";
import JSZip from "jszip";
import type { Score } from "../model";

function isMxlExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(".mxl");
}

async function extractMxl(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const containerXml = zip.file("META-INF/container.xml");
  if (containerXml) {
    const containerText = await containerXml.async("string");
    const match = containerText.match(/full-path="([^"]+)"/);
    if (match) {
      const mainFile = zip.file(match[1]);
      if (mainFile) return mainFile.async("string");
    }
  }
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.endsWith(".xml") && !name.startsWith("META-INF")) {
      return file.async("string");
    }
  }
  throw new Error("No MusicXML file found in .mxl archive");
}

export type LoadResult = { score: Score; path: string; displayHints: MusicXMLImportResult["displayHints"]; viewConfig?: MusicXMLImportResult["viewConfig"] };

export async function loadScore(presetPath?: string): Promise<LoadResult | null> {
  function fromXml(xml: string, path: string): LoadResult {
    const result = importFromMusicXML(xml, true);
    return { score: result.score, path, displayHints: result.displayHints, viewConfig: result.viewConfig };
  }

  try {
    const { readTextFile, readFile } = await import("@tauri-apps/plugin-fs");

    let path: string | null = presetPath ?? null;
    if (!path) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        filters: [
          { name: "MusicXML", extensions: ["musicxml", "mxl", "xml"] },
        ],
        multiple: false,
      });
      path = picked as string | null;
    }

    if (!path) return null;

    if (isMxlExtension(path)) {
      const buf = await readFile(path);
      const xml = await extractMxl(buf.buffer as ArrayBuffer);
      return fromXml(xml, path);
    }

    const content = await readTextFile(path);
    return fromXml(content, path);
  } catch {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".musicxml,.mxl,.xml";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        if (isMxlExtension(file.name)) {
          const buf = await file.arrayBuffer();
          const xml = await extractMxl(buf);
          resolve(fromXml(xml, file.name));
          return;
        }
        const text = await file.text();
        resolve(fromXml(text, file.name));
      };
      input.click();
    });
  }
}
