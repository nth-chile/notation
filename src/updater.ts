let updateChecked = false;
let pendingUpdate: any = null;

export async function checkForUpdates(manual = false) {
  if (!manual && updateChecked) return;
  updateChecked = true;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update) {
      pendingUpdate = update;
      showUpdateDialog(update.version);
    } else if (manual) {
      const { showToast } = await import("./components/Toast");
      showToast("You're on the latest version", "success");
    }
  } catch {
    if (manual) {
      const { showToast } = await import("./components/Toast");
      showToast("Could not check for updates", "error");
    }
  }
}

let updateDialogVisible = false;
const updateDialogListeners = new Set<() => void>();
let pendingVersion = "";

export function getUpdateDialogState() {
  return updateDialogVisible ? pendingVersion : null;
}

export function subscribeUpdateDialog(cb: () => void) {
  updateDialogListeners.add(cb);
  return () => updateDialogListeners.delete(cb);
}

function showUpdateDialog(version: string) {
  pendingVersion = version;
  updateDialogVisible = true;
  for (const cb of updateDialogListeners) cb();
}

export function dismissUpdateDialog() {
  updateDialogVisible = false;
  for (const cb of updateDialogListeners) cb();
}

export async function installAndRestart() {
  if (!pendingUpdate) return;
  try {
    const { showToast } = await import("./components/Toast");
    showToast("Installing update…", "info");
    await pendingUpdate.downloadAndInstall();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (err) {
    const { showToast } = await import("./components/Toast");
    showToast("Update failed — try again later", "error");
    console.error("Update install failed:", err);
  }
}
