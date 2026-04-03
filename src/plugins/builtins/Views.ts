import type { NotationPlugin, PluginAPI } from "../PluginAPI";
import {
  leadSheetConfig,
  tabConfig,
  fullScoreConfig,
} from "../../views/ViewMode";

export const ViewsPlugin: NotationPlugin = {
  id: "notation.views",
  name: "View Modes",
  version: "1.0.0",
  description: "Full Score, Lead Sheet, and Tab view modes",

  activate(api: PluginAPI) {
    api.registerView("view.lead-sheet", {
      name: "Lead Sheet",
      icon: "\u266A",
      getViewConfig: leadSheetConfig,
    });

    api.registerView("view.tab", {
      name: "Tab",
      icon: "TAB",
      getViewConfig: tabConfig,
    });

    api.registerView("view.full-score", {
      name: "Full Score",
      icon: "\uD834\uDD1E",
      getViewConfig: fullScoreConfig,
    });
  },
};
