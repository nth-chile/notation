import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLicenseState,
  recordSave,
  activateLicense,
  deactivateLicense,
  isLicensed,
  _resetAll,
} from "../index";

// Mock fetch to simulate offline (LemonSqueezy API unreachable)
// This makes activateLicense fall through to the offline acceptance path
vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));

beforeEach(() => {
  _resetAll();
});

describe("licensing", () => {
  it("starts unlicensed", () => {
    expect(isLicensed()).toBe(false);
    const s = getLicenseState();
    expect(s.licenseKey).toBeNull();
    expect(s.isValid).toBe(false);
    expect(s.savesSinceNag).toBe(0);
  });

  it("activates with any non-empty key (offline)", async () => {
    expect(await activateLicense("ABC-123")).toBe(true);
    expect(isLicensed()).toBe(true);
    expect(getLicenseState().licenseKey).toBe("ABC-123");
  });

  it("rejects empty/whitespace keys", async () => {
    expect(await activateLicense("")).toBe(false);
    expect(await activateLicense("   ")).toBe(false);
    expect(isLicensed()).toBe(false);
  });

  it("trims whitespace from keys", async () => {
    await activateLicense("  KEY-456  ");
    expect(getLicenseState().licenseKey).toBe("KEY-456");
  });

  it("deactivates license", async () => {
    await activateLicense("ABC-123");
    expect(isLicensed()).toBe(true);
    deactivateLicense();
    expect(isLicensed()).toBe(false);
    expect(getLicenseState().licenseKey).toBeNull();
  });

  it("rejects key when API says invalid", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ json: () => Promise.resolve({ valid: false }) })
    );
    expect(await activateLicense("BAD-KEY")).toBe(false);
    expect(isLicensed()).toBe(false);
    // Restore offline mock
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
  });

  it("accepts key when API says valid", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ json: () => Promise.resolve({ valid: true }) })
    );
    expect(await activateLicense("GOOD-KEY")).toBe(true);
    expect(isLicensed()).toBe(true);
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
  });
});

describe("recordSave nag", () => {
  it("does not nag when licensed", async () => {
    await activateLicense("KEY");
    for (let i = 0; i < 30; i++) {
      expect(recordSave()).toBe(false);
    }
  });

  it("nags every 20 saves when unlicensed", () => {
    for (let i = 1; i <= 19; i++) {
      expect(recordSave()).toBe(false);
    }
    expect(recordSave()).toBe(true); // 20th save
    for (let i = 1; i <= 19; i++) {
      expect(recordSave()).toBe(false);
    }
    expect(recordSave()).toBe(true); // 40th save
  });

  it("resets nag counter on activation", async () => {
    for (let i = 0; i < 15; i++) recordSave();
    expect(getLicenseState().savesSinceNag).toBe(15);
    await activateLicense("KEY");
    expect(getLicenseState().savesSinceNag).toBe(0);
  });

  it("resets nag counter on deactivation", () => {
    for (let i = 0; i < 10; i++) recordSave();
    deactivateLicense();
    expect(getLicenseState().savesSinceNag).toBe(0);
  });
});
