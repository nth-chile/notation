export type AnnotationFilter = "chord-symbol" | "lyric" | "rehearsal-mark" | "tempo-mark" | "dynamic" | "hairpin" | "slur";

export type InputMode = "standard" | "tab";

/** Per-part notation display toggles (Guitar Pro style) */
export interface NotationDisplay {
  standard: boolean;
  tab: boolean;
  slash: boolean;
}

export const DEFAULT_NOTATION_DISPLAY: NotationDisplay = {
  standard: true,
  tab: false,
  slash: false,
};

export interface ViewConfig {
  partsToShow: number[] | "all";
  /** Per-part notation display — missing entries default to standard only */
  notationDisplay: Record<number, NotationDisplay>;
  showAnnotations: AnnotationFilter[];
  layoutConfig: ViewLayoutConfig;
}

export interface ViewLayoutConfig {
  compact: boolean;
  measuresPerLine?: number;
  showPartNames: boolean;
  /** When true, render score with page breaks */
  pageLayout?: boolean;
  /** Override page width in CSS pixels (default: 816 = 8.5in at 96dpi) */
  pageWidth?: number;
  /** Override page height in CSS pixels (default: 1056 = 11in at 96dpi) */
  pageHeight?: number;
  /** Override top margin in pixels */
  topMargin?: number;
  /** Override bottom margin in pixels */
  bottomMargin?: number;
  /** Override left margin in pixels */
  leftMargin?: number;
}

/** Default view config — standard notation for all parts */
export function defaultViewConfig(): ViewConfig {
  return {
    partsToShow: "all",
    notationDisplay: {},
    showAnnotations: ["chord-symbol", "lyric", "rehearsal-mark", "tempo-mark", "dynamic", "hairpin", "slur"],
    layoutConfig: {
      compact: false,
      showPartNames: true,
    },
  };
}

/** Get the notation display for a specific part, with fallback to default */
export function getPartDisplay(viewConfig: ViewConfig, partIndex: number): NotationDisplay {
  return viewConfig.notationDisplay[partIndex] ?? DEFAULT_NOTATION_DISPLAY;
}

/**
 * Returns true if the given staveIndex within a part corresponds to a tab stave.
 * Stave indexing order within a part: standard staves (0..N-1), then slash, then tab.
 * `standardCount` is the number of standard staves this part is showing (instrument.staves
 * or 0 when standard display is off).
 */
export function isTabStave(
  viewConfig: ViewConfig,
  partIndex: number,
  staveIndex: number,
  standardCount: number,
): boolean {
  const display = getPartDisplay(viewConfig, partIndex);
  if (!display.tab) return false;
  const tabStaveIdx = standardCount + (display.slash ? 1 : 0);
  return staveIndex === tabStaveIdx;
}

/** Derive input mode: tab when cursor is on a tab stave, or when tab-only display.
 *  If `staveIndex` and `standardCount` are provided, derives mode from the cursor
 *  position. Otherwise falls back to the legacy `tabInputActive` boolean. */
export function getEffectiveInputMode(
  viewConfig: ViewConfig,
  partIndex: number,
  tabInputActive?: boolean,
  staveIndex?: number,
  standardCount?: number,
): InputMode {
  if (staveIndex != null && standardCount != null) {
    if (isTabStave(viewConfig, partIndex, staveIndex, standardCount)) return "tab";
    // Non-tab stave of a multi-stave-display part is always standard.
    return "standard";
  }
  if (tabInputActive) return "tab";
  const display = getPartDisplay(viewConfig, partIndex);
  if (display.tab && !display.standard && !display.slash) return "tab";
  return "standard";
}
