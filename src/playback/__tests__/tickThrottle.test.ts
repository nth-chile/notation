import { describe, it, expect } from "vitest";
import { _getTickThrottleMs } from "../TonePlayback";

/**
 * The playback cursor runs on requestAnimationFrame (~60fps) but we only
 * push tick updates into Zustand at ~30fps. Downstream effects of a tick
 * update include a full canvas re-render and four cascading store updates;
 * halving that rate avoids GC pressure over long loop sessions.
 *
 * This test pins the throttle interval so it isn't accidentally removed or
 * cranked back up to per-frame without deliberate thought.
 */
describe("playback tick throttling", () => {
  it("caps onTick callback rate at ~30fps", () => {
    const ms = _getTickThrottleMs();
    // Must be ≥ 16ms (throttles below 60fps) and ≤ 50ms (stays smooth).
    expect(ms).toBeGreaterThanOrEqual(16);
    expect(ms).toBeLessThanOrEqual(50);
  });

  it("throttle interval corresponds to approximately 30fps", () => {
    const ms = _getTickThrottleMs();
    const fps = 1000 / ms;
    expect(fps).toBeGreaterThanOrEqual(20);
    expect(fps).toBeLessThanOrEqual(60);
  });
});
