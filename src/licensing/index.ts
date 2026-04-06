const LICENSE_STORAGE_KEY = "nubium-license";

export interface LicenseState {
  licenseKey: string | null;
  savesSinceNag: number;
  isValid: boolean;
}

const NAG_INTERVAL = 20;

function defaultState(): LicenseState {
  return { licenseKey: null, savesSinceNag: 0, isValid: false };
}

let state: LicenseState | null = null;

export function getLicenseState(): LicenseState {
  if (state) return state;
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    state = stored ? { ...defaultState(), ...JSON.parse(stored) } : defaultState();
  } catch {
    state = defaultState();
  }
  return state!;
}

function persist() {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Reset in-memory cache so next read comes from localStorage (for testing) */
export function _resetCache() {
  state = null;
}

/** Full reset: clear both in-memory state and localStorage (for testing) */
export function _resetAll() {
  state = null;
  try { localStorage.removeItem(LICENSE_STORAGE_KEY); } catch { /* ignore */ }
}

/** Returns true if the nag dialog should be shown */
export function recordSave(): boolean {
  const s = getLicenseState();
  if (s.isValid) return false;
  s.savesSinceNag++;
  persist();
  if (s.savesSinceNag >= NAG_INTERVAL) {
    s.savesSinceNag = 0;
    persist();
    return true;
  }
  return false;
}

/**
 * Validate and store a license key.
 * Validates against LemonSqueezy API when online, falls back to accepting
 * any non-empty key when offline.
 */
export async function activateLicense(key: string): Promise<boolean> {
  const s = getLicenseState();
  const trimmed = key.trim();
  if (!trimmed) return false;

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: trimmed }),
    });
    const data = await res.json();
    if (!data.valid) return false;
  } catch {
    // Offline — accept the key, validate next launch
  }

  s.licenseKey = trimmed;
  s.isValid = true;
  s.savesSinceNag = 0;
  persist();
  return true;
}

export function deactivateLicense() {
  const s = getLicenseState();
  s.licenseKey = null;
  s.isValid = false;
  s.savesSinceNag = 0;
  persist();
}

export function isLicensed(): boolean {
  return getLicenseState().isValid;
}
