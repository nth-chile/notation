import { type ViewConfig, tabConfig } from "./ViewMode";

/**
 * Tab View: tab staff for guitar parts, standard staff for others.
 * By default, assumes part index 0 is guitar.
 */
export function getViewConfig(guitarPartIndices: number[] = [0]): ViewConfig {
  return tabConfig(guitarPartIndices);
}
