import { describe, it, expect } from "vitest";
import {
  partStandardStaveCount,
  partHasSlash,
  partHasTab,
  partStaveCount,
  systemHeight,
  computeLayout,
  DEFAULT_LAYOUT,
} from "../SystemLayout";
import type { Score } from "../../model/score";
import type { ViewConfig } from "../../views/ViewMode";
import { defaultViewConfig } from "../../views/ViewMode";
import { emptyScore } from "../../model/factory";

function makeScore(instrumentIds: string[] = ["piano"]): Score {
  const score = emptyScore();
  // Replace default part with specified instruments
  score.parts = instrumentIds.map((id) => ({
    ...score.parts[0],
    name: id,
    instrumentId: id,
  }));
  return score;
}

function configWith(partDisplays: Record<number, { standard: boolean; tab: boolean; slash: boolean }>): ViewConfig {
  const config = defaultViewConfig();
  config.notationDisplay = partDisplays;
  return config;
}

describe("partStandardStaveCount", () => {
  it("returns 1 for single-staff instrument with standard on", () => {
    const score = makeScore(["acoustic-guitar"]);
    const vc = configWith({ 0: { standard: true, tab: false, slash: false } });
    expect(partStandardStaveCount(score, 0, vc)).toBe(1);
  });

  it("returns 2 for piano (grand staff) with standard on", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: true, tab: false, slash: false } });
    expect(partStandardStaveCount(score, 0, vc)).toBe(2);
  });

  it("returns 0 when standard is off", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: false, tab: true, slash: false } });
    expect(partStandardStaveCount(score, 0, vc)).toBe(0);
  });

  it("returns 0 when only slash is on (slash is its own stave)", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: false, tab: false, slash: true } });
    expect(partStandardStaveCount(score, 0, vc)).toBe(0);
  });
});

describe("partHasSlash", () => {
  it("returns false by default", () => {
    expect(partHasSlash(0)).toBe(false);
  });

  it("returns true when slash is enabled", () => {
    const vc = configWith({ 0: { standard: true, tab: false, slash: true } });
    expect(partHasSlash(0, vc)).toBe(true);
  });

  it("returns false when slash is disabled", () => {
    const vc = configWith({ 0: { standard: true, tab: true, slash: false } });
    expect(partHasSlash(0, vc)).toBe(false);
  });
});

describe("partHasTab", () => {
  it("returns false by default", () => {
    expect(partHasTab(0)).toBe(false);
  });

  it("returns true when tab is enabled", () => {
    const vc = configWith({ 0: { standard: false, tab: true, slash: false } });
    expect(partHasTab(0, vc)).toBe(true);
  });
});

describe("partStaveCount", () => {
  it("counts standard only", () => {
    const score = makeScore(["acoustic-guitar"]);
    const vc = configWith({ 0: { standard: true, tab: false, slash: false } });
    expect(partStaveCount(score, 0, undefined, vc)).toBe(1);
  });

  it("counts standard + tab", () => {
    const score = makeScore(["acoustic-guitar"]);
    const vc = configWith({ 0: { standard: true, tab: true, slash: false } });
    expect(partStaveCount(score, 0, undefined, vc)).toBe(2);
  });

  it("counts standard + slash + tab", () => {
    const score = makeScore(["acoustic-guitar"]);
    const vc = configWith({ 0: { standard: true, tab: true, slash: true } });
    expect(partStaveCount(score, 0, undefined, vc)).toBe(3);
  });

  it("counts slash-only as 1", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: false, tab: false, slash: true } });
    expect(partStaveCount(score, 0, undefined, vc)).toBe(1);
  });

  it("counts grand staff + slash + tab as 4", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: true, tab: true, slash: true } });
    expect(partStaveCount(score, 0, undefined, vc)).toBe(4);
  });
});

describe("first-system indent (partLabelWidth)", () => {
  it("indents the first system by partLabelWidth when set", () => {
    const score = makeScore(["piano", "violin"]);
    const config = { ...DEFAULT_LAYOUT, availableWidth: 1000, adaptiveWidths: true, partLabelWidth: 60 };
    const systems = computeLayout(score, config);
    expect(systems.length).toBeGreaterThan(0);
    const firstStave = systems[0].staves[0];
    expect(firstStave.x).toBe(config.leftMargin + 60);
  });

  it("does not indent the first system when partLabelWidth is 0", () => {
    const score = makeScore(["piano"]);
    const config = { ...DEFAULT_LAYOUT, availableWidth: 1000, adaptiveWidths: true, partLabelWidth: 0 };
    const systems = computeLayout(score, config);
    expect(systems.length).toBeGreaterThan(0);
    const firstStave = systems[0].staves[0];
    expect(firstStave.x).toBe(config.leftMargin);
  });

  it("only indents the first system — later systems flush to leftMargin", () => {
    // Force many measures so we get multiple systems
    const score = makeScore(["piano", "violin"]);
    for (const part of score.parts) {
      const template = part.measures[0];
      for (let i = 0; i < 16; i++) {
        part.measures.push({ ...template, id: `m-${i + 1}` as typeof template.id });
      }
    }
    const config = { ...DEFAULT_LAYOUT, availableWidth: 600, adaptiveWidths: true, partLabelWidth: 60 };
    const systems = computeLayout(score, config);
    expect(systems.length).toBeGreaterThan(1);
    const firstStave = systems[0].staves[0];
    const laterStave = systems[1].staves[0];
    expect(firstStave.x).toBe(config.leftMargin + 60);
    expect(laterStave.x).toBe(config.leftMargin);
  });
});

describe("tab-only inter-system spacing", () => {
  // Multi-system score: one guitar part, many measures
  function multiMeasure(instrumentId: string, count: number) {
    const score = makeScore([instrumentId]);
    const template = score.parts[0].measures[0];
    for (let i = 0; i < count - 1; i++) {
      score.parts[0].measures.push({ ...template, id: `m-${i + 1}` as typeof template.id });
    }
    return score;
  }

  it("tab-only systems are packed tighter than standard-only systems", () => {
    const score = multiMeasure("acoustic-guitar", 20);
    const config = { ...DEFAULT_LAYOUT, availableWidth: 500, adaptiveWidths: true };
    const tabOnly = configWith({ 0: { standard: false, tab: true, slash: false } });
    const standardOnly = configWith({ 0: { standard: true, tab: false, slash: false } });

    const tabSystems = computeLayout(score, config, undefined, tabOnly);
    const stdSystems = computeLayout(score, config, undefined, standardOnly);

    // Both should have multiple systems at this width
    expect(tabSystems.length).toBeGreaterThan(1);
    expect(stdSystems.length).toBeGreaterThan(1);

    // Per-system gap — use distance between system starts minus system height
    const tabGap = tabSystems[1].y - (tabSystems[0].y + tabSystems[0].height);
    const stdGap = stdSystems[1].y - (stdSystems[0].y + stdSystems[0].height);

    expect(tabGap).toBeLessThan(stdGap);
  });

  it("mixed (standard + tab) systems use the full staffSpacing, not the shrunk value", () => {
    const score = multiMeasure("acoustic-guitar", 20);
    const config = { ...DEFAULT_LAYOUT, availableWidth: 500, adaptiveWidths: true };
    const mixed = configWith({ 0: { standard: true, tab: true, slash: false } });

    const systems = computeLayout(score, config, undefined, mixed);
    expect(systems.length).toBeGreaterThan(1);

    const gap = systems[1].y - (systems[0].y + systems[0].height);
    expect(gap).toBe(DEFAULT_LAYOUT.staffSpacing);
  });
});

describe("systemHeight", () => {
  it("increases when slash stave is added", () => {
    const score = makeScore(["acoustic-guitar"]);
    const standardOnly = configWith({ 0: { standard: true, tab: false, slash: false } });
    const withSlash = configWith({ 0: { standard: true, tab: false, slash: true } });

    const hStandard = systemHeight(score, DEFAULT_LAYOUT, undefined, standardOnly);
    const hSlash = systemHeight(score, DEFAULT_LAYOUT, undefined, withSlash);

    // Slash adds staffHeight + grandStaffSpacing
    expect(hSlash).toBe(hStandard + DEFAULT_LAYOUT.staffHeight + DEFAULT_LAYOUT.grandStaffSpacing);
  });

  it("slash-only has single staffHeight", () => {
    const score = makeScore(["piano"]);
    const vc = configWith({ 0: { standard: false, tab: false, slash: true } });
    const h = systemHeight(score, DEFAULT_LAYOUT, undefined, vc);
    expect(h).toBe(DEFAULT_LAYOUT.staffHeight);
  });
});
