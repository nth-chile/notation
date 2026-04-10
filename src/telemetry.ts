import { getSettings } from "./settings";

const ENDPOINT = "https://nubium-telemetry.jaredsalzano.workers.dev/ping";

export function sendLaunchPing() {
  if (import.meta.env.DEV) return;
  if (getSettings().telemetryOptOut) return;

  const version = __APP_VERSION__;
  const os = detectOS();

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, os }),
  }).catch(() => {});
}

function detectOS(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "darwin";
  if (ua.includes("linux")) return "linux";
  if (ua.includes("win")) return "windows";
  return "unknown";
}
