import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import { importFromMusicXML } from "../../musicxml/import";
import { exportToMusicXML } from "../../musicxml/export";

export const MusicXMLPlugin: NotationPlugin = {
  id: "notation.musicxml",
  name: "MusicXML",
  version: "1.0.0",
  description: "Import and export MusicXML and PDF files",

  activate(api: PluginAPI) {
    api.registerImporter("musicxml.import", {
      name: "MusicXML",
      extensions: [".musicxml", ".xml"],
      import: (content: string) => importFromMusicXML(content),
    });

    api.registerExporter("musicxml.export", {
      name: "MusicXML",
      extension: ".musicxml",
      export: (score) => exportToMusicXML(score),
    });

    api.registerCommand("notation.export-musicxml", "Export as MusicXML", () => {
      const score = api.getScore();
      const content = exportToMusicXML(score);
      // Trigger download
      const blob = new Blob([content], { type: "application/vnd.recordare.musicxml+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${score.title || "Untitled"}.musicxml`;
      a.click();
      URL.revokeObjectURL(url);
      api.showNotification("Exported MusicXML", "success");
    });

    api.registerCommand("notation.export-pdf", "Export as PDF", () => {
      const score = api.getScore();
      api.showNotification("Generating PDF...", "info");
      import("../../fileio/pdf").then(({ exportPDF }) => {
        exportPDF(score)
          .then(() => api.showNotification("PDF exported", "success"))
          .catch((err) => api.showNotification(`PDF export failed: ${err}`, "error"));
      });
    });

    api.registerCommand("notation.export-part-pdf", "Export Current Part as PDF", () => {
      const score = api.getScore();
      const { partIndex } = api.getCursorPosition();
      const partName = score.parts[partIndex]?.name ?? `Part ${partIndex + 1}`;
      api.showNotification(`Generating PDF for ${partName}...`, "info");
      import("../../fileio/pdf").then(({ exportPartPDF }) => {
        exportPartPDF(score, partIndex)
          .then(() => api.showNotification(`PDF exported for ${partName}`, "success"))
          .catch((err) => api.showNotification(`PDF export failed: ${err}`, "error"));
      });
    });
  },
};
