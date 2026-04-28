You are releasing a new version of Nubium. Do this autonomously — do NOT ask the user questions.

The user may provide a version number as an argument (e.g. `/release 0.2.0`). If not provided, auto-increment the patch version from the current version in `src-tauri/tauri.conf.json`.

## Steps

1. **Read current version** from `src-tauri/tauri.conf.json`

2. **Determine new version**: Use the argument if provided, otherwise increment the patch number. Use numeric-only versions (e.g. `0.2.0`, not `0.2.0-beta.1`).

3. **Check for uncommitted changes**: Run `git status`. If there are uncommitted changes, stop and tell the user to commit first.

3a. **Sync help docs**: Run `npm run sync-docs`. This regenerates the keyboard shortcut tables in `../nubium-website/src/pages/help.astro` from `src/settings/keybindings.ts`. If it modified the website file (run `git -C ../nubium-website status --short src/pages/help.astro`), tell the user to review and push the website repo before continuing. Don't block — just surface it.

3b. **Auto-fill `## Unreleased` from commits**: Run `npm run sync-changelog`. This appends commit subjects since the last release tag (skipping chore/refactor/test/ci/build/docs and merges) into the Unreleased section, deduped against existing items. Idempotent — safe to run multiple times.

3c. **Review and clean Unreleased**: Read `CHANGELOG.md`. The auto-filled entries are commit subjects, not user prose. Rewrite them in plain user language, merge duplicates with hand-written entries, drop anything purely internal that slipped through. Stop and tell the user if Unreleased ends up empty — every release needs at least one user-facing line.

3d. **Promote `## Unreleased`**: Rename the heading to `## {VERSION} — {YYYY-MM}` (use the current month) and insert a fresh empty `## Unreleased` section above it.

4. **Bump version**: Update `"version"` in `src-tauri/tauri.conf.json`

5. **Commit, tag, push**:
   ```
   git add src-tauri/tauri.conf.json CHANGELOG.md
   git commit -m "Release v{VERSION}"
   git tag v{VERSION}
   git push origin main v{VERSION}
   ```

6. **Wait for CI**: Watch the release workflow with `gh run watch`. Use `run_in_background` and report when done.

7. **Publish**: Once CI passes, run `gh release edit v{VERSION} --draft=false`

8. **Verify latest.json**: `curl -sL https://github.com/nth-chile/nubium/releases/latest/download/latest.json` — confirm it has the new version and non-empty platforms.

9. **Report**: Tell the user the release is live with the version number and release URL.

## Notes

- Windows builds may fail (MSI version format). This is expected — macOS and Linux are the priority.
- The `updater` CI job signs artifacts and generates `latest.json` automatically.
- If CI fails on macOS/Linux, check the logs with `gh run view {ID} --log-failed` and diagnose.
- Don't create a second release to "test" anything — one release per invocation.
- The CHANGELOG entry surfaces in two places: the in-app "What's new" modal on first launch after update, and the website `/changelog` page. Write user-facing language, not commit messages.
