import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import { useEditorStore } from "../../state/EditorState";

export const TitleDisplayPlugin: NotationPlugin = {
  id: "notation.title-display",
  name: "Title & Composer",
  version: "1.0.0",
  description: "Show title and composer text above the score",
  activate(_api: PluginAPI) {
    useEditorStore.getState().setShowTitle(true);
  },
  deactivate() {
    useEditorStore.getState().setShowTitle(false);
  },
};
