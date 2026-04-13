import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { SetAccidental } from "../SetAccidental";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

function makeSnapshot(overrides?: {
  measures?: ReturnType<typeof factory.measure>[];
  cursor?: Partial<ReturnType<typeof defaultInputState>["cursor"]>;
  selectedHeadIndex?: number | null;
}): EditorSnapshot {
  const measures = overrides?.measures ?? [
    factory.measure([factory.voice([])]),
  ];
  const input = defaultInputState();
  if (overrides?.cursor) {
    Object.assign(input.cursor, overrides.cursor);
  }
  if (overrides?.selectedHeadIndex !== undefined) {
    input.selectedHeadIndex = overrides.selectedHeadIndex;
  }
  return {
    score: factory.score("Test", "", [factory.part("P", "P", measures)]),
    inputState: input,
  };
}

describe("SetAccidental on a single note (#217)", () => {
  it("sets sharp on a note", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("C", 4, factory.dur("quarter"))]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp");
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("note");
    if (evt.kind === "note") {
      expect(evt.head.pitch.accidental).toBe("sharp");
    }
  });

  it("sets flat on a note", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.note("B", 4, factory.dur("quarter"))]),
        ]),
      ],
    });
    const cmd = new SetAccidental("flat");
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "note") {
      expect(evt.head.pitch.accidental).toBe("flat");
    }
  });
});

describe("SetAccidental on a chord — only targeted head (#217)", () => {
  it("changes only headIndex 0 when headIndex is 0", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4), factory.noteHead("G", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp", 0);
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("chord");
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("sharp");
      expect(evt.heads[1].pitch.accidental).toBe("natural");
      expect(evt.heads[2].pitch.accidental).toBe("natural");
    }
  });

  it("changes only headIndex 1 when headIndex is 1", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4), factory.noteHead("G", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("flat", 1);
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("natural");
      expect(evt.heads[1].pitch.accidental).toBe("flat");
      expect(evt.heads[2].pitch.accidental).toBe("natural");
    }
  });

  it("changes only the last head when headIndex targets it", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4), factory.noteHead("G", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("double-sharp", 2);
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("natural");
      expect(evt.heads[1].pitch.accidental).toBe("natural");
      expect(evt.heads[2].pitch.accidental).toBe("double-sharp");
    }
  });

  it("changes ALL heads when no headIndex is provided", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp");
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("sharp");
      expect(evt.heads[1].pitch.accidental).toBe("sharp");
    }
  });

  it("changes ALL heads when headIndex is null", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("flat", null);
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("flat");
      expect(evt.heads[1].pitch.accidental).toBe("flat");
    }
  });

  it("changes ALL heads when headIndex is out of range", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([
            factory.chord(
              [factory.noteHead("C", 4), factory.noteHead("E", 4)],
              factory.dur("quarter"),
            ),
          ]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp", 99);
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    if (evt.kind === "chord") {
      expect(evt.heads[0].pitch.accidental).toBe("sharp");
      expect(evt.heads[1].pitch.accidental).toBe("sharp");
    }
  });
});

describe("SetAccidental on grace note (#217)", () => {
  it("sets accidental on a grace note", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.graceNote("B", 3)]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp");
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("grace");
    if (evt.kind === "grace") {
      expect(evt.head.pitch.accidental).toBe("sharp");
    }
  });
});

describe("SetAccidental does not modify rests (#217)", () => {
  it("returns state unchanged for a rest", () => {
    const snap = makeSnapshot({
      measures: [
        factory.measure([
          factory.voice([factory.rest(factory.dur("quarter"))]),
        ]),
      ],
    });
    const cmd = new SetAccidental("sharp");
    const result = cmd.execute(snap);
    const evt = result.score.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("rest");
  });
});
