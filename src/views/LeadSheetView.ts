import { type ViewConfig, leadSheetConfig } from "./ViewMode";

/**
 * Lead Sheet View: single staff (melody), chord symbols, lyrics, compact layout.
 */
export function getViewConfig(): ViewConfig {
  return leadSheetConfig();
}
