/**
 * Sync the keyboard shortcut reference tables in the website's help.astro
 * to match the source-of-truth in src/settings/keybindings.ts.
 *
 * Run: npx tsx scripts/sync-help-docs.ts
 *
 * Replaces content between AUTOGEN markers in
 * ../nubium-website/src/pages/help.astro.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { SHORTCUT_ACTIONS, type KeyBinding } from "../src/settings/keybindings";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELP_PATH = path.resolve(__dirname, "../../nubium-website/src/pages/help.astro");
const START = "<!-- AUTOGEN:SHORTCUTS START -->";
const END = "<!-- AUTOGEN:SHORTCUTS END -->";

const SECTIONS: Array<{ heading: string; categories: string[]; note?: string }> = [
  { heading: "Notes", categories: ["Notes", "Modes", "Transforms"] },
  { heading: "Duration", categories: ["Duration"] },
  { heading: "Accidentals", categories: ["Accidentals"] },
  { heading: "Navigation", categories: ["Navigation"] },
  { heading: "Selection", categories: ["Selection"] },
  { heading: "Voices", categories: ["Voices"] },
  {
    heading: "Annotations",
    categories: ["Annotation"],
    note: "Bare-letter shortcuts apply in normal mode (toggle with <kbd>N</kbd>).",
  },
  { heading: "Articulations", categories: ["Articulations"] },
  { heading: "Editing", categories: ["Editing"] },
  { heading: "Playback", categories: ["Playback"] },
  { heading: "File", categories: ["File"] },
  { heading: "Views", categories: ["Views"] },
  { heading: "UI", categories: ["UI", "View"] },
];

/** Plugin-registered shortcuts that aren't in SHORTCUT_ACTIONS. Add to the
 *  matching section's `extras` rendering below. */
const PLUGIN_EXTRAS: Record<string, Array<{ binding: string; label: string }>> = {
  UI: [{ binding: "Ctrl+Shift+A", label: "Toggle AI Chat" }],
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatKey(key: string): string {
  const named: Record<string, string> = {
    " ": "Space",
    arrowleft: "←",
    arrowright: "→",
    arrowup: "↑",
    arrowdown: "↓",
    backspace: "Backspace",
    escape: "Esc",
    enter: "Enter",
  };
  return named[key] ?? key.toUpperCase();
}

function formatBinding(b: KeyBinding): string {
  const parts: string[] = [];
  if (b.ctrl) parts.push("Ctrl");
  if (b.alt) parts.push("Alt");
  if (b.shift) parts.push("Shift");
  parts.push(formatKey(b.key));
  return parts.join("+");
}

function tableRow(binding: string, label: string): string {
  return `              <tr class="border-b border-[var(--color-border)]"><td class="py-2 pr-8"><kbd>${escapeHtml(binding)}</kbd></td><td class="py-2">${escapeHtml(label)}</td></tr>`;
}

function renderSection(heading: string, rows: string[], note?: string): string {
  const noteHtml = note
    ? `        <p class="text-xs text-[var(--color-text-muted)] mb-3">${note}</p>\n`
    : "";
  // Make the last row not have a bottom border (matches existing style).
  const fixedRows = rows.map((r, i) =>
    i === rows.length - 1 ? r.replace(' class="border-b border-[var(--color-border)]"', "") : r,
  );
  return [
    `        <h3 class="text-lg font-semibold mt-8 mb-3">${escapeHtml(heading)}</h3>`,
    noteHtml.trimEnd() && noteHtml.trimEnd(),
    `        <div class="overflow-x-auto">`,
    `          <table class="w-full text-sm">`,
    `            <tbody class="text-[var(--color-text-muted)]">`,
    ...fixedRows,
    `            </tbody>`,
    `          </table>`,
    `        </div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function generate(): string {
  const out: string[] = [START];
  out.push(`        <p class="text-[var(--color-text-muted)] text-sm mb-6">On Mac, use <kbd>Cmd</kbd> in place of <kbd>Ctrl</kbd>. All shortcuts can be customized in Settings → Hotkeys.</p>`);
  for (const section of SECTIONS) {
    const actions = SHORTCUT_ACTIONS.filter((a) => section.categories.includes(a.category));
    const extras = PLUGIN_EXTRAS[section.heading] ?? [];
    if (actions.length === 0 && extras.length === 0) continue;
    const rows = [
      ...actions.map((a) => tableRow(formatBinding(a.defaultBinding), a.label)),
      ...extras.map((e) => tableRow(e.binding, e.label)),
    ];
    out.push(renderSection(section.heading, rows, section.note));
  }
  out.push(`        ${END}`);
  return out.join("\n");
}

function main() {
  const helpText = fs.readFileSync(HELP_PATH, "utf8");
  const startIdx = helpText.indexOf(START);
  const endIdx = helpText.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    console.error(`Markers not found in ${HELP_PATH}.`);
    console.error(`Expected to find ${START} and ${END}.`);
    process.exit(1);
  }
  const before = helpText.slice(0, startIdx);
  const after = helpText.slice(endIdx + END.length);
  const generated = generate();
  const next = before + generated + after;
  if (next === helpText) {
    console.log("Help docs already in sync.");
    return;
  }
  fs.writeFileSync(HELP_PATH, next, "utf8");
  console.log(`Updated ${HELP_PATH}`);
}

main();
