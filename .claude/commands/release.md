You are releasing a new version of Nubium. Do this autonomously — do NOT ask the user questions.

The user may provide a version number as an argument (e.g. `/release 0.2.0`). If not provided, auto-increment the patch version from the current version in `src-tauri/tauri.conf.json`.

## Steps

1. **Read current version** from `src-tauri/tauri.conf.json`

2. **Determine new version**: Use the argument if provided, otherwise increment the patch number. Use numeric-only versions (e.g. `0.2.0`, not `0.2.0-beta.1`).

3. **Check for uncommitted changes**: Run `git status`. If there are uncommitted changes, stop and tell the user to commit first.

4. **Bump version**: Update `"version"` in `src-tauri/tauri.conf.json`

5. **Commit, tag, push**:
   ```
   git add src-tauri/tauri.conf.json
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
