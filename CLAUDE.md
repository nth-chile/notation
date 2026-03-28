# Notation

AI-native music notation editor. Tauri v2 + React + TypeScript + VexFlow 5.

## Architecture

- **Data model** (`src/model/`): Source of truth. Score → Part → Measure → Voice → NoteEvent (Note | Chord | Rest | Slash). Annotations (chords, lyrics, rehearsal marks, tempo). Navigation marks (repeats, voltas, coda, segno). Instruments, stylesheet, guitar tab info.
- **Serialization** (`src/serialization/`): JSON-based `.notation` format. Single `json.ts` file handles serialize/deserialize for file storage and AI context.
- **Renderer** (`src/renderer/`): VexFlow 5 behind adapter (`vexBridge.ts`). Canvas-based. SystemLayout for multi-part positioning. TabRenderer for guitar tab. Proportional spacing, automatic beaming, adaptive measure widths.
- **Commands** (`src/commands/`): All mutations via Command pattern for undo/redo. InsertNote, DeleteNote, ChangePitch, ChangeDuration, InsertMeasure, DeleteMeasure, SetChordSymbol, SetLyric, SetTempo, SetRepeatBarline, SetVolta, SetNavigationMark, AddPart, RemovePart, and more.
- **State** (`src/state/`): Zustand stores. `useEditorStore` (score, input, rendering), `useChatStore` (AI chat).
- **Views** (`src/views/`): Full Score, Lead Sheet, Songwriter, Tab. Each filters/transforms rendering of the same data model.
- **AI** (`src/ai/`): Chat sidebar, Anthropic + OpenAI providers, score context builder, diff/apply. Presets: /harmonize, /transpose, /fill-drums, /simplify, /bass-line.
- **Playback** (`src/playback/`): Web Audio oscillator synth, lookahead scheduler, transport, metronome, PlaybackOrder (follows repeats/D.S./D.C.).
- **Plugins** (`src/plugins/`): Plugin API with sandboxed instances. Built-ins: Transpose, Retrograde, Augment/Diminish, ChordAnalysis. Command palette (Ctrl+Shift+P).
- **MusicXML** (`src/musicxml/`): Full import/export for interop with MuseScore, Dorico, Sibelius, etc.
- **Settings** (`src/settings/`): AppSettings persisted to localStorage.
- **File I/O** (`src/fileio/`): Tauri native dialogs with browser fallback. .notation and .musicxml.
- **Tauri** (`src-tauri/`): Minimal Rust — file I/O commands.

## Commands

```bash
npm run dev          # Vite dev server (for browser testing)
npm run build        # Production build
npm run test         # Vitest (125 tests)
npm run tauri dev    # Full Tauri desktop app
```

## Keyboard Shortcuts

A-G: insert note | R: rest | 1-7: duration | .: dot | +/-: sharp/flat
Arrow L/R: move cursor | Arrow U/D: octave | Backspace: delete
Ctrl+Z / Ctrl+Shift+Z: undo/redo | Ctrl+S: save | Ctrl+O: open
Ctrl+1-4: switch voice | Ctrl+M: insert measure
Ctrl+Shift+1-4: switch view | Ctrl+Shift+A: AI chat
Ctrl+Shift+P: command palette | Space: play/pause
Shift+C: chord input | Shift+L: lyric input
Alt+Up/Down: navigate between parts

## Serialization Format (.notation)

JSON-based format. File extension is `.notation`, content is JSON.

```json
{
  "formatVersion": 1,
  "title": "Song",
  "composer": "Author",
  "tempo": 140,
  "parts": [
    {
      "name": "Piano",
      "abbreviation": "Pno.",
      "instrument": "piano",
      "measures": [
        {
          "number": 1,
          "time": "4/4",
          "key": 0,
          "clef": "treble",
          "annotations": [
            { "type": "chord", "beat": 0, "symbol": "Cmaj7" },
            { "type": "rehearsal", "label": "A" },
            { "type": "tempo", "bpm": 120, "beatUnit": "quarter", "text": "Allegro" }
          ],
          "navigation": { "segno": true, "volta": { "endings": [1] } },
          "voices": [
            {
              "events": [
                { "type": "note", "pitch": "C4", "duration": "quarter" },
                { "type": "note", "pitch": "F4", "accidental": "sharp", "duration": "eighth" },
                { "type": "chord", "pitches": ["C4", "E4", "G4"], "duration": "half" },
                { "type": "rest", "duration": "quarter" },
                { "type": "slash", "duration": "quarter" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Pitches: Letter + octave (C4 = middle C). Accidentals: "sharp", "flat", "double-sharp", "double-flat".
Durations: "whole", "half", "quarter", "eighth", "16th", "32nd", "64th". Append "." for dotted.
Key signatures (fifths): -7 to 7. Barlines: single, double, final, repeat-start, repeat-end, repeat-both.
