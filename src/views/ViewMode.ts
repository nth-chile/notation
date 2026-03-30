export type ViewModeType = "full-score" | "lead-sheet" | "songwriter" | "tab";

export type AnnotationFilter = "chord-symbol" | "lyric" | "rehearsal-mark" | "tempo-mark" | "dynamic" | "hairpin" | "slur";

export interface ViewConfig {
  type: ViewModeType;
  partsToShow: number[] | "all";
  staffType: Record<number, "standard" | "tab">; // per part index
  showAnnotations: AnnotationFilter[];
  layoutConfig: ViewLayoutConfig;
}

export interface ViewLayoutConfig {
  compact: boolean;
  measuresPerLine?: number;
  showPartNames: boolean;
  /** When true, render score with page breaks (US Letter layout) */
  pageLayout?: boolean;
}

/** Full Score: all parts, full detail (default) */
export function fullScoreConfig(): ViewConfig {
  return {
    type: "full-score",
    partsToShow: "all",
    staffType: {},
    showAnnotations: ["chord-symbol", "lyric", "rehearsal-mark", "tempo-mark", "dynamic", "hairpin", "slur"],
    layoutConfig: {
      compact: false,
      showPartNames: true,
    },
  };
}

/** Lead Sheet: single staff (melody, part 0), chord symbols, lyrics, compact */
export function leadSheetConfig(): ViewConfig {
  return {
    type: "lead-sheet",
    partsToShow: [0],
    staffType: { 0: "standard" },
    showAnnotations: ["chord-symbol", "lyric", "rehearsal-mark", "tempo-mark", "dynamic", "hairpin", "slur"],
    layoutConfig: {
      compact: true,
      measuresPerLine: 4,
      showPartNames: false,
    },
  };
}

/** Songwriter: melody part, chord symbols prominent, lyrics below, minimal staff detail */
export function songwriterConfig(): ViewConfig {
  return {
    type: "songwriter",
    partsToShow: [0],
    staffType: { 0: "standard" },
    showAnnotations: ["chord-symbol", "lyric", "dynamic", "hairpin", "slur"],
    layoutConfig: {
      compact: true,
      measuresPerLine: 4,
      showPartNames: false,
    },
  };
}

/** Tab: tab staff for guitar parts, standard for others */
export function tabConfig(guitarPartIndices: number[] = [0]): ViewConfig {
  const staffType: Record<number, "standard" | "tab"> = {};
  for (const idx of guitarPartIndices) {
    staffType[idx] = "tab";
  }
  return {
    type: "tab",
    partsToShow: "all",
    staffType,
    showAnnotations: ["chord-symbol", "lyric", "rehearsal-mark", "tempo-mark", "dynamic", "hairpin", "slur"],
    layoutConfig: {
      compact: false,
      showPartNames: true,
    },
  };
}

/** Get the default ViewConfig for a given view mode type */
export function getDefaultViewConfig(type: ViewModeType): ViewConfig {
  switch (type) {
    case "full-score":
      return fullScoreConfig();
    case "lead-sheet":
      return leadSheetConfig();
    case "songwriter":
      return songwriterConfig();
    case "tab":
      return tabConfig();
  }
}
