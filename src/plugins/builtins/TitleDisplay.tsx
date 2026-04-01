import { createElement } from "react";
import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import { useEditorStore } from "../../state/EditorState";
import { getSettings, updateSettings } from "../../settings";
import { Switch } from "../../components/ui/switch";

function TitleSettings() {
  const showComposer = useEditorStore((s) => s.showComposer);
  return createElement("label", {
    className: "flex items-center justify-between text-sm",
  },
    createElement("span", null, "Show composer"),
    createElement(Switch, {
      checked: showComposer,
      onCheckedChange: (checked: boolean) => {
        useEditorStore.getState().setShowComposer(checked);
        updateSettings({ showComposer: checked });
      },
    }),
  );
}

export const TitleDisplayPlugin: NotationPlugin = {
  id: "notation.title-display",
  name: "Title & Composer",
  version: "1.0.0",
  description: "Show title and composer text above the score",
  activate(api: PluginAPI) {
    const settings = getSettings();
    useEditorStore.getState().setShowTitle(settings.showTitle ?? true);
    useEditorStore.getState().setShowComposer(settings.showComposer ?? false);

    api.registerCommand("notation.toggle-composer", "Toggle Composer Display", () => {
      const store = useEditorStore.getState();
      const next = !store.showComposer;
      store.setShowComposer(next);
      updateSettings({ showComposer: next });
    });

    api.registerSettings(() => createElement(TitleSettings));
  },
  deactivate() {
    useEditorStore.getState().setShowTitle(false);
    useEditorStore.getState().setShowComposer(false);
  },
};
