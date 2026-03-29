import { describe, it, expect } from "vitest";
import {
  defaultKeyBindings,
  formatBinding,
  matchesBinding,
  eventToBinding,
  SHORTCUT_ACTIONS,
  type KeyBinding,
} from "../keybindings";

function fakeKeyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe("defaultKeyBindings", () => {
  it("returns a binding for every shortcut action", () => {
    const bindings = defaultKeyBindings();
    for (const action of SHORTCUT_ACTIONS) {
      expect(bindings[action.id]).toBeDefined();
    }
  });

  it("maps note:c to the 'c' key", () => {
    const bindings = defaultKeyBindings();
    expect(bindings["note:c"].key).toBe("c");
  });

  it("maps undo to ctrl+z", () => {
    const bindings = defaultKeyBindings();
    expect(bindings["undo"].key).toBe("z");
    expect(bindings["undo"].ctrl).toBe(true);
  });
});

describe("matchesBinding", () => {
  it("matches a simple key", () => {
    const binding: KeyBinding = { key: "a" };
    const event = fakeKeyEvent({ key: "a" });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("rejects wrong key", () => {
    const binding: KeyBinding = { key: "a" };
    const event = fakeKeyEvent({ key: "b" });
    expect(matchesBinding(event, binding)).toBe(false);
  });

  it("matches ctrl modifier", () => {
    const binding: KeyBinding = { key: "z", ctrl: true };
    const event = fakeKeyEvent({ key: "z", ctrlKey: true });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("matches metaKey as ctrl (Mac)", () => {
    const binding: KeyBinding = { key: "z", ctrl: true };
    const event = fakeKeyEvent({ key: "z", metaKey: true });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("rejects when ctrl expected but not pressed", () => {
    const binding: KeyBinding = { key: "z", ctrl: true };
    const event = fakeKeyEvent({ key: "z" });
    expect(matchesBinding(event, binding)).toBe(false);
  });

  it("rejects when ctrl pressed but not expected", () => {
    const binding: KeyBinding = { key: "a" };
    const event = fakeKeyEvent({ key: "a", ctrlKey: true });
    expect(matchesBinding(event, binding)).toBe(false);
  });

  it("matches shift modifier", () => {
    const binding: KeyBinding = { key: "z", ctrl: true, shift: true };
    const event = fakeKeyEvent({ key: "z", ctrlKey: true, shiftKey: true });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("matches alt modifier", () => {
    const binding: KeyBinding = { key: "arrowup", alt: true };
    const event = fakeKeyEvent({ key: "ArrowUp", altKey: true });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("matches shifted special characters like >", () => {
    const binding: KeyBinding = { key: ">", shift: true };
    const event = fakeKeyEvent({ key: ">", shiftKey: true });
    expect(matchesBinding(event, binding)).toBe(true);
  });

  it("rejects > when < is pressed", () => {
    const binding: KeyBinding = { key: ">", shift: true };
    const event = fakeKeyEvent({ key: "<", shiftKey: true });
    expect(matchesBinding(event, binding)).toBe(false);
  });

  it("is case-insensitive for normal keys", () => {
    const binding: KeyBinding = { key: "a" };
    const event = fakeKeyEvent({ key: "A" });
    expect(matchesBinding(event, binding)).toBe(true);
  });
});

describe("eventToBinding", () => {
  it("parses a simple key press", () => {
    const event = fakeKeyEvent({ key: "a" });
    expect(eventToBinding(event)).toEqual({ key: "a" });
  });

  it("includes ctrl when pressed", () => {
    const event = fakeKeyEvent({ key: "z", ctrlKey: true });
    expect(eventToBinding(event)).toEqual({ key: "z", ctrl: true });
  });

  it("includes shift and alt", () => {
    const event = fakeKeyEvent({ key: "p", ctrlKey: true, shiftKey: true, altKey: true });
    expect(eventToBinding(event)).toEqual({ key: "p", ctrl: true, shift: true, alt: true });
  });

  it("returns null for bare modifier keys", () => {
    expect(eventToBinding(fakeKeyEvent({ key: "Control" }))).toBeNull();
    expect(eventToBinding(fakeKeyEvent({ key: "Shift" }))).toBeNull();
    expect(eventToBinding(fakeKeyEvent({ key: "Alt" }))).toBeNull();
    expect(eventToBinding(fakeKeyEvent({ key: "Meta" }))).toBeNull();
  });

  it("treats metaKey as ctrl", () => {
    const event = fakeKeyEvent({ key: "s", metaKey: true });
    const binding = eventToBinding(event);
    expect(binding?.ctrl).toBe(true);
  });
});

describe("formatBinding", () => {
  it("formats a simple key", () => {
    const result = formatBinding({ key: "a" });
    expect(result).toContain("A");
  });

  it("formats space key", () => {
    const result = formatBinding({ key: " " });
    expect(result).toContain("Space");
  });

  it("formats arrow keys with symbols", () => {
    expect(formatBinding({ key: "arrowleft" })).toContain("\u2190");
    expect(formatBinding({ key: "arrowright" })).toContain("\u2192");
  });

  it("includes modifier prefixes", () => {
    const result = formatBinding({ key: "z", ctrl: true, shift: true });
    // Either Mac or non-Mac format
    expect(result.length).toBeGreaterThan(1);
  });
});
