import { useSyncExternalStore } from "react";
import { getSettings, subscribeSettings, getBindingLabel } from "../settings";

function getKeyBindings() {
  return getSettings().keyBindings;
}

function subscribe(onStoreChange: () => void) {
  return subscribeSettings(() => onStoreChange());
}

/**
 * Returns a function that resolves an action ID to its formatted hotkey label.
 * Reactively updates when keybindings change.
 */
export function useHotkey() {
  const bindings = useSyncExternalStore(subscribe, getKeyBindings);
  return (actionId: string) => getBindingLabel(actionId, bindings);
}
