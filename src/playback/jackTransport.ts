import { TICKS_PER_QUARTER } from "../model/duration";
import { getSettings, updateSettings, subscribeSettings } from "../settings/Settings";

let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let connected = false;
let sampleRate = 48000;
const listeners = new Set<(connected: boolean) => void>();

async function getInvoke() {
  if (invoke) return invoke;
  try {
    const mod = await import("@tauri-apps/api/core");
    invoke = mod.invoke;
    return invoke;
  } catch {
    return null;
  }
}

function setConnected(v: boolean) {
  if (connected === v) return;
  connected = v;
  for (const l of listeners) l(v);
}

export function isJackConnected(): boolean {
  return connected;
}

export function subscribe(cb: (connected: boolean) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function connect(): Promise<void> {
  const inv = await getInvoke();
  if (!inv) throw new Error("JACK transport requires the desktop app");
  try {
    sampleRate = (await inv("jack_connect")) as number;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("already connected")) {
      await inv("jack_disconnect").catch(() => {});
      sampleRate = (await inv("jack_connect")) as number;
    } else {
      throw e;
    }
  }
  setConnected(true);
  updateSettings({ jackAutoConnect: true });
}

export async function disconnect(): Promise<void> {
  updateSettings({ jackAutoConnect: false });
  const inv = await getInvoke();
  if (!inv) return;
  try {
    await inv("jack_disconnect");
  } finally {
    setConnected(false);
  }
}

/** Reconnect on app launch if the user had JACK on previously. Fails silently. */
export async function tryAutoConnect(): Promise<void> {
  // Settings load asynchronously from disk on Tauri (the localStorage cache
  // can be stale after a fresh launch). Try once now, then react to settings
  // updates in case the disk-loaded value flipped the flag on.
  const attempt = async () => {
    if (connected || !getSettings().jackAutoConnect) return;
    try { await connect(); } catch { /* JACK server probably not running */ }
  };
  await attempt();
  const unsub = subscribeSettings(() => { void attempt(); });
  // Stop listening once we've connected (or after a few seconds — settings
  // either loaded by then or there's no config file).
  setTimeout(() => unsub(), 5000);
}

export function tickToFrame(tick: number, bpm: number): number {
  const seconds = (tick / TICKS_PER_QUARTER) * (60 / bpm);
  return Math.max(0, Math.round(seconds * sampleRate));
}

export async function start(): Promise<void> {
  if (!connected) return;
  const inv = await getInvoke();
  if (!inv) return;
  await inv("jack_transport_start");
}

export async function stop(): Promise<void> {
  if (!connected) return;
  const inv = await getInvoke();
  if (!inv) return;
  await inv("jack_transport_stop");
}

export async function locate(frame: number): Promise<void> {
  if (!connected) return;
  const inv = await getInvoke();
  if (!inv) return;
  await inv("jack_transport_locate", { frame });
}

export async function locateTick(tick: number, bpm: number): Promise<void> {
  await locate(tickToFrame(tick, bpm));
}
