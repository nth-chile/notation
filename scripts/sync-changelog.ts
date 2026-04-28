/**
 * Syncs commits since the last release tag into `## Unreleased` of CHANGELOG.md.
 *
 * Idempotent: only appends commit subjects that are not already present in the
 * Unreleased section. Skips internal commits (chore/refactor/test/ci/build,
 * release commits, merge commits). Strips `(#123)` PR suffixes.
 *
 * Run via `npm run sync-changelog`. Invoked by `/release` before promotion.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const SKIP_PATTERNS = [
  /^Release v/i,
  /^Merge /,
  /^chore[:(]/i,
  /^refactor[:(]/i,
  /^test[:(]/i,
  /^ci[:(]/i,
  /^build[:(]/i,
  /^docs?[:(]/i,
  /^style[:(]/i,
  /^wip\b/i,
  /^bump version/i,
  /^update changelog/i,
  /^sync changelog/i,
];

function lastReleaseTag(): string | null {
  try {
    const out = execSync("git describe --tags --abbrev=0 --match='v*'", { cwd: ROOT, encoding: "utf8" }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function commitsSince(ref: string | null): string[] {
  const range = ref ? `${ref}..HEAD` : "HEAD";
  const out = execSync(`git log ${range} --no-merges --pretty=format:%s`, { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map((line) => line.trim()).filter(Boolean);
}

function clean(subject: string): string {
  return subject.replace(/\s*\(#\d+\)\s*$/, "").trim();
}

function shouldSkip(subject: string): boolean {
  return SKIP_PATTERNS.some((re) => re.test(subject));
}

function readChangelog(): string {
  if (!existsSync(CHANGELOG)) {
    throw new Error(`CHANGELOG.md not found at ${CHANGELOG}`);
  }
  return readFileSync(CHANGELOG, "utf8");
}

interface UnreleasedSplit {
  before: string;
  unreleasedHeader: string;
  unreleasedBody: string;
  after: string;
}

function splitUnreleased(md: string): UnreleasedSplit {
  const lines = md.split("\n");
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+unreleased/i.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error("CHANGELOG.md has no `## Unreleased` section. Add one before running sync.");
  }
  let nextHeaderIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      nextHeaderIdx = i;
      break;
    }
  }
  return {
    before: lines.slice(0, headerIdx).join("\n"),
    unreleasedHeader: lines[headerIdx],
    unreleasedBody: lines.slice(headerIdx + 1, nextHeaderIdx).join("\n"),
    after: lines.slice(nextHeaderIdx).join("\n"),
  };
}

function existingItems(body: string): Set<string> {
  const items = new Set<string>();
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(.+)$/);
    if (m) items.add(m[1].trim().toLowerCase());
  }
  return items;
}

function main() {
  const tag = lastReleaseTag();
  const subjects = commitsSince(tag).map(clean).filter((s) => s && !shouldSkip(s));

  const md = readChangelog();
  const split = splitUnreleased(md);
  const existing = existingItems(split.unreleasedBody);

  const newEntries: string[] = [];
  for (const s of subjects) {
    if (existing.has(s.toLowerCase())) continue;
    existing.add(s.toLowerCase());
    newEntries.push(`- ${s}`);
  }

  if (newEntries.length === 0) {
    console.log("[sync-changelog] No new entries to add.");
    return;
  }

  const trimmedBody = split.unreleasedBody.replace(/^\n+|\n+$/g, "");
  const body = [trimmedBody, ...newEntries].filter(Boolean).join("\n");
  const updated = [
    split.before,
    split.unreleasedHeader,
    "",
    body,
    "",
    split.after,
  ].filter((s, i, arr) => !(s === "" && arr[i - 1] === "")).join("\n");

  writeFileSync(CHANGELOG, updated.endsWith("\n") ? updated : updated + "\n");
  console.log(`[sync-changelog] Added ${newEntries.length} ${newEntries.length === 1 ? "entry" : "entries"} since ${tag ?? "repo start"}:`);
  for (const e of newEntries) console.log(`  ${e}`);
  console.log("\nReview CHANGELOG.md before releasing — commit subjects are a starting point, not the final copy.");
}

main();
