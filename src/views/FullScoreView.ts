import { type ViewConfig, fullScoreConfig } from "./ViewMode";

/**
 * Full Score View: all parts, full detail.
 * This is the default view mode.
 */
export function getViewConfig(): ViewConfig {
  return fullScoreConfig();
}
