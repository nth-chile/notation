import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import { useEditorStore } from "../../state/EditorState";

export const LyricsPlugin: NotationPlugin = {
  id: "notation.lyrics",
  name: "Lyrics",
  version: "1.0.0",
  description: "Display and edit lyrics below notes",
  activate(_api: PluginAPI) {
    useEditorStore.getState().setShowLyrics(true);
  },
  deactivate() {
    useEditorStore.getState().setShowLyrics(false);
  },
};
