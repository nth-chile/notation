import { type ViewConfig, songwriterConfig } from "./ViewMode";

/**
 * Songwriter View: melody part only, chord symbols prominent, lyrics below,
 * minimal staff detail, larger chord text.
 */
export function getViewConfig(): ViewConfig {
  return songwriterConfig();
}
