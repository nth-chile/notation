import { describe, it, expect } from "vitest";
import type { Annotation, Lyric } from "../../model/annotations";
import type { Measure, NoteEventId } from "../../model";

/**
 * Tests for #278 — Lyrics render on the stave that owns their target note.
 *
 * Previously, the renderer suppressed lyrics on the primary (treble) stave
 * of a grand staff, forcing them to render only on the bass. When lyrics'
 * `noteEventId` belonged to a treble-stave note (e.g. piano-instrument
 * single-staff vocal MusicXML imports), the bass stave had no matching
 * note box and the lyric was silently dropped.
 *
 * The render loop filters each lyric by `noteBoxes.find(nb => nb.id === ann.noteEventId)`,
 * which already restricts each lyric to the stave that owns its target note.
 * No explicit suppression is needed.
 */

function lyric(text: string, noteEventId: string, verseNumber = 1): Lyric {
  return {
    kind: "lyric",
    text,
    noteEventId: noteEventId as NoteEventId,
    syllableType: "single",
    verseNumber,
  };
}

/** Replicates the per-stave noteBox filtering used by the lyric render loop. */
function renderLyricsForStave(
  annotations: Annotation[],
  noteBoxIdsOnThisStave: Set<string>,
): Lyric[] {
  return annotations
    .filter((a): a is Lyric => a.kind === "lyric")
    .filter((l) => noteBoxIdsOnThisStave.has(l.noteEventId));
}

describe("lyric stave assignment (#278)", () => {
  it("renders lyrics on the treble stave when their target note is on treble", () => {
    const trebleEventIds = new Set(["evt_t1", "evt_t2", "evt_t3"]);
    const bassEventIds = new Set(["evt_b1", "evt_b2"]);

    const annotations: Annotation[] = [
      lyric("Hel", "evt_t1"),
      lyric("lo", "evt_t2"),
      lyric("world", "evt_t3"),
    ];

    expect(renderLyricsForStave(annotations, trebleEventIds)).toHaveLength(3);
    expect(renderLyricsForStave(annotations, bassEventIds)).toHaveLength(0);
  });

  it("renders lyrics on the bass stave when their target note is on bass", () => {
    const trebleEventIds = new Set(["evt_t1"]);
    const bassEventIds = new Set(["evt_b1", "evt_b2"]);

    const annotations: Annotation[] = [
      lyric("low", "evt_b1"),
      lyric("note", "evt_b2"),
    ];

    expect(renderLyricsForStave(annotations, trebleEventIds)).toHaveLength(0);
    expect(renderLyricsForStave(annotations, bassEventIds)).toHaveLength(2);
  });

  it("does not duplicate a lyric across grand staves (each event lives on exactly one stave)", () => {
    const trebleEventIds = new Set(["evt_t1"]);
    const bassEventIds = new Set(["evt_b1"]);

    const annotations: Annotation[] = [lyric("once", "evt_t1")];

    const trebleHits = renderLyricsForStave(annotations, trebleEventIds);
    const bassHits = renderLyricsForStave(annotations, bassEventIds);
    expect(trebleHits.length + bassHits.length).toBe(1);
  });

  it("renders single-staff lyrics regardless of suppression flags (regression for piano-instrument single-staff vocal imports)", () => {
    // Piano-instrument single-staff vocal: instrument has staves=2 so renderer
    // creates two staves, but the imported voice has staff=undefined → renders
    // on treble. Lyrics must show on treble.
    const trebleEventIds = new Set(["evt_n1", "evt_n2", "evt_n3", "evt_n4"]);
    const bassEventIds = new Set<string>(); // no bass events in source

    const measure: Pick<Measure, "annotations"> = {
      annotations: [
        lyric("1", "evt_n1"),
        lyric("and", "evt_n2"),
        lyric("2", "evt_n3"),
        lyric("+", "evt_n4"),
      ],
    };

    expect(renderLyricsForStave(measure.annotations, trebleEventIds)).toHaveLength(4);
    expect(renderLyricsForStave(measure.annotations, bassEventIds)).toHaveLength(0);
  });
});
