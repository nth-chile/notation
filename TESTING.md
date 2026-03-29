# Testing Matrix

Feature inventory cross-referenced with test coverage. Gaps marked with **UNTESTED**.

## Legend
- Unit = vitest unit test exists
- E2E = Playwright integration test exists
- Manual = requires human judgment (sound, visual, feel)

---

## Note Input

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Insert note A-G | Keyboard | - | Yes | |
| Insert rest | R key | - | Yes | |
| Delete note | Backspace | - | Yes | |
| Change pitch on existing note | A-G on note | Yes | Yes | |
| Set duration 1-7 | Keyboard | - | Yes | |
| Toggle dot | . key | - | Yes | |
| Set sharp | +/= key | - | Yes | |
| Set flat | -/_ key | - | Yes | |
| Auto-advance on full measure | Auto | Yes | Yes | |
| Change octave | Up/Down arrow | - | Yes | |
| Move cursor | Left/Right arrow | - | Yes | |
| Switch voice 1-4 | Ctrl+1-4 | - | Yes | |
| Note mode / Select mode toggle | Escape/N | - | Yes | |

## Articulations

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Toggle accent | Shift+> | - | Yes | |
| Toggle staccato | Shift+< | - | Yes | |
| Toggle tenuto | Shift+T | - | Yes | |
| Toggle fermata | Shift+U | - | Yes | |
| Toggle marcato | Shift+^ | - | Yes | |
| Guitar articulations (bend, slide, etc.) | Command palette | - | **UNTESTED** | Manual: verify rendering |

## Text Annotations

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Enter chord symbol | Shift+C | - | Yes | |
| Commit chord (Enter) | Enter | - | Yes | |
| Cancel chord (Escape) | Escape | - | Yes | |
| Enter lyric | Shift+L | - | Yes | |
| Lyric advance (Tab) | Tab | - | Yes | |
| Chord symbol serialization | Auto | Yes | - | |
| Lyric serialization | Auto | Yes | - | |

## Measure Operations

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Insert measure | Ctrl+M | Yes | Yes | |
| Delete measure | Ctrl+Shift+Backspace | Yes | Yes | |
| Cannot delete non-empty measure | Guard | Yes | - | |
| Cannot delete last measure | Guard | Yes | - | |
| Change time signature | Command | Yes | - | **UNTESTED E2E** |
| Change key signature | Command | Yes | - | **UNTESTED E2E** |
| Change clef | Command | Yes | - | **UNTESTED E2E** |
| Selection extend (Shift+arrows) | Shift+Left/Right | - | Yes | |
| Delete selected measures | Delete with selection | - | Yes | |

## Multi-Part Management

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Add part | Button/Command | Yes | Yes | |
| Remove part | Button | Yes | Yes | |
| Reorder part up/down | Buttons | Yes | - | **UNTESTED E2E** |
| Solo part | Button | - | Yes | Manual: verify audio |
| Mute part | Button | - | Yes | Manual: verify audio |
| Move cursor between parts | Alt+Up/Down | - | Yes | |
| Cursor adjusts on part removal | Auto | Yes | - | |

## Undo/Redo

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Undo | Ctrl+Z | - | Yes | |
| Redo | Ctrl+Shift+Z | - | Yes | |
| Undo after every mutation type | - | - | **UNTESTED** | High priority gap |

## Navigation Marks

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Repeat barlines | Command | - | **UNTESTED** | |
| Volta brackets | Command | - | **UNTESTED** | |
| D.S. al Coda | Command | - | **UNTESTED** | |
| D.C. al Fine | Command | - | **UNTESTED** | |
| Segno/Coda marks | Command | - | **UNTESTED** | |
| Navigation serialization | Auto | Yes | - | |
| Playback follows repeats | Auto | Yes | - | |
| Playback follows D.S./D.C. | Auto | Yes | - | |

## Views

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Switch to Full Score | Ctrl+Shift+4 / click | - | Yes | |
| Switch to Lead Sheet | Ctrl+Shift+2 / click | - | Yes | |
| Switch to Songwriter | Ctrl+Shift+1 / click | - | Yes | |
| Switch to Tab | Ctrl+Shift+3 / click | - | Yes | |
| View filters annotations correctly | Auto | - | **UNTESTED** | Manual: visual check |
| Tab renders tablature | Auto | - | **UNTESTED** | Manual: visual check |

## File I/O

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Save .notation JSON | Ctrl+S | - | **UNTESTED** | Tauri dialog |
| Open .notation JSON | Ctrl+O | - | **UNTESTED** | Tauri dialog |
| Import MusicXML | Open dialog | Yes | **UNTESTED** | |
| Import .mxl (compressed) | Open dialog | - | **UNTESTED** | |
| Export MusicXML | Command | Yes | **UNTESTED** | |
| Export PDF | Command | - | **UNTESTED** | |
| Copy as ABC | Command | Yes | **UNTESTED** | |
| Copy as LilyPond | Command | Yes | **UNTESTED** | |
| Copy as MusicXML | Command | - | **UNTESTED** | |
| Paste notation | Command | Yes | **UNTESTED** | |
| Auto-save to localStorage | Auto (2s debounce) | - | Yes | |
| Restore from auto-save | Page load | - | Yes | |
| File history snapshots | Menu | - | **UNTESTED** | |
| MusicXML round-trip | Auto | Yes | - | |
| ABC round-trip | Auto | Yes | - | |

## Playback

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Play/Pause | Space / button | - | Yes | Manual: verify audio |
| Stop | Button | - | Yes | |
| Tempo change | BPM input | - | Yes | |
| Metronome toggle | Button | - | Yes | Manual: verify audio |
| Cursor follows playback | Auto | - | **UNTESTED** | Manual: visual check |
| Playback order with repeats | Auto | Yes | - | |
| Solo/Mute affects audio | Auto | - | **UNTESTED** | Manual: verify audio |
| SoundFont instrument loading | Auto | - | **UNTESTED** | |

## AI Chat

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Send message | Enter | - | Yes | Needs API key |
| AI applies score edit | Auto | - | **UNTESTED** | Mock API |
| Undo AI edit | Menu item | - | Yes | |
| Clear chat | Menu item | - | Yes | |
| Settings toggle | Menu item | - | Yes | |
| Provider switch | Dropdown | - | **UNTESTED** | |
| Error display | Auto | - | **UNTESTED** | |

## Layout & Panels

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Toggle left sidebar | Button | - | Yes | |
| Toggle right sidebar | Button | - | Yes | |
| Resize sidebar drag | Mouse drag | - | Yes | |
| Drag past min hides sidebar | Mouse drag | - | Yes | |
| Collapse/expand panel | Chevron click | - | Yes | |
| Drag panel between sidebars | DnD | - | Yes | |
| Reorder panels within sidebar | DnD | - | Yes | |
| Layout persists to localStorage | Auto | - | Yes | |
| AI Chat fills remaining height | Auto | - | Yes | |
| Panel menu (three-dot) | Click | - | Yes | |

## Plugins

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Open plugin panel | Toolbar button | - | Yes | |
| Toggle plugin on/off | Switch | - | Yes | |
| Plugin state persists | Auto | - | **UNTESTED** | |
| Transpose up/down | Command palette | Yes | Yes | |
| Analyze chords | Command palette | Yes | Yes | |
| Command palette open/search | Ctrl+Shift+P | - | Yes | |

## Rendering

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Beam grouping | Auto | Yes | - | Manual: visual check |
| Measure width calculation | Auto | Yes | - | |
| Note spacing | Auto | Yes | - | |
| Multi-measure rests | Auto | - | **UNTESTED** | Manual: visual check |
| Dark mode canvas inversion | Auto | - | Yes | |
| Title/composer rendering | Auto | - | **UNTESTED** | Manual: visual check |
| Cursor highlight on note | Auto | - | Yes | |
| Playback cursor | Auto | - | **UNTESTED** | Manual: visual check |

## Clipboard

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Copy as ABC | Ctrl+C / Command | Yes | **UNTESTED** | Needs E2E |
| Copy as LilyPond | Command | Yes | **UNTESTED** | Needs E2E |
| Copy as MusicXML | Command | - | **UNTESTED** | Needs E2E |
| Paste notation | Ctrl+V / Command | Yes | **UNTESTED** | Needs E2E |
| Auto-detect paste format (ABC) | Auto | Yes | **UNTESTED** | Needs E2E |
| Auto-detect paste format (LilyPond) | Auto | Yes | **UNTESTED** | Needs E2E |
| Auto-detect paste format (MusicXML) | Auto | - | **UNTESTED** | Needs E2E |
| Paste preserves annotations | Auto | - | **UNTESTED** | Needs E2E |
| Copy/paste round-trip fidelity | Auto | - | **UNTESTED** | Needs E2E |

## PDF Export

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Export full score PDF | Command | - | **UNTESTED** | Needs E2E; manual: verify layout |
| Export single part PDF | Command | - | **UNTESTED** | Needs E2E; manual: verify part isolation |
| PDF page breaks | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |
| PDF title/composer header | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |
| PDF respects stylesheet | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |

## SoundFont Playback

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Instrument-to-SoundFont mapping | Auto | - | **UNTESTED** | Needs E2E |
| SoundFont preloading on score open | Auto | - | **UNTESTED** | Needs E2E; verify no audio gap |
| SoundFont fallback to oscillator | Auto | - | **UNTESTED** | Needs E2E |
| Part instrument change updates sound | Dropdown | - | **UNTESTED** | Needs E2E; manual: verify audio |
| SoundFont loading indicator | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |

## File History

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Snapshot on save | Auto | - | **UNTESTED** | Needs E2E |
| Snapshot on significant edit | Auto | - | **UNTESTED** | Needs E2E |
| Open history modal | Menu | - | **UNTESTED** | Needs E2E |
| Browse snapshots in modal | Click | - | **UNTESTED** | Needs E2E |
| Restore from snapshot | Button | - | **UNTESTED** | Needs E2E |
| Snapshot preview | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |
| History storage limits | Auto | - | **UNTESTED** | Needs E2E |

## Tuplets

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Insert triplet | Command | - | **UNTESTED** | Needs E2E |
| Insert quintuplet/septuplet | Command | - | **UNTESTED** | Needs E2E |
| Duration scaling (e.g. 2/3) | Auto | - | **UNTESTED** | Needs E2E |
| Tuplet serialization (.notation) | Auto | - | **UNTESTED** | Needs E2E |
| Tuplet MusicXML export | Auto | - | **UNTESTED** | Needs E2E |
| Tuplet MusicXML import | Auto | - | **UNTESTED** | Needs E2E |
| Tuplet MusicXML round-trip | Auto | - | **UNTESTED** | Needs E2E |
| Tuplet rendering (bracket/number) | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |
| Tuplet playback timing | Auto | - | **UNTESTED** | Needs E2E; manual: verify audio |
| Nested tuplets | Command | - | **UNTESTED** | Needs E2E |

## Score Overlay

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Inline title editing | Click on title | - | **UNTESTED** | Needs E2E |
| Inline composer editing | Click on composer | - | **UNTESTED** | Needs E2E |
| Click-to-insert note on staff | Click on staff | - | **UNTESTED** | Needs E2E |
| Overlay hover feedback | Mouse move | - | **UNTESTED** | Needs E2E; manual: visual check |
| Overlay respects zoom level | Auto | - | **UNTESTED** | Needs E2E |
| Overlay coordinate accuracy | Auto | - | **UNTESTED** | Needs E2E; manual: visual check |

## Articulations (Extended)

| Feature | Input | Unit | E2E | Notes |
|---------|-------|------|-----|-------|
| Toggle accent | Shift+> | - | **UNTESTED** | Needs E2E |
| Toggle staccato | Shift+< | - | **UNTESTED** | Needs E2E |
| Toggle tenuto | Shift+T | - | **UNTESTED** | Needs E2E |
| Toggle fermata | Shift+U | - | **UNTESTED** | Needs E2E |
| Toggle marcato | Shift+^ | - | **UNTESTED** | Needs E2E |
| Toggle staccatissimo | Command palette | - | **UNTESTED** | Needs E2E |
| Toggle trill | Command palette | - | **UNTESTED** | Needs E2E |
| Toggle turn | Command palette | - | **UNTESTED** | Needs E2E |
| Toggle mordent | Command palette | - | **UNTESTED** | Needs E2E |
| Toggle snap (pizzicato) | Command palette | - | **UNTESTED** | Needs E2E |
| Guitar bend | Command palette | - | **UNTESTED** | Needs E2E; manual: verify rendering |
| Guitar slide | Command palette | - | **UNTESTED** | Needs E2E; manual: verify rendering |
| Guitar hammer-on/pull-off | Command palette | - | **UNTESTED** | Needs E2E; manual: verify rendering |
| Articulation serialization | Auto | - | **UNTESTED** | Needs E2E |
| Articulation MusicXML round-trip | Auto | - | **UNTESTED** | Needs E2E |
| Multiple articulations on one note | Command | - | **UNTESTED** | Needs E2E |

---

## Priority Gaps

1. **Undo after every mutation type** — most likely source of state corruption bugs
2. **Navigation marks (repeats, D.S., volta)** — complex state, no E2E coverage
3. **Tuplet support** — new feature, zero E2E coverage; serialization and MusicXML round-trip critical
4. **Clipboard round-trips** — copy/paste across all formats needs browser-level E2E testing
5. **File history snapshots** — new feature, no coverage; restore correctness is critical
6. **Score overlay interactions** — click-to-insert and inline editing need coordinate-accurate E2E tests
7. **SoundFont playback** — instrument mapping and preloading untested; fallback path untested
8. **PDF export** — no automated verification; at minimum validate file is generated
9. **Articulations (extended types)** — ornaments, guitar-specific articulations have no E2E coverage
10. **File I/O round-trips** — save/load/export need browser-level testing
11. **View annotation filtering** — each view shows different annotations, not verified
12. **Multi-measure rest rendering** — no tests
13. **AI edit apply/revert flow** — needs mock API E2E test
