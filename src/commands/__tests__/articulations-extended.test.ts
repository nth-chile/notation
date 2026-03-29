import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { ToggleArticulation } from "../ToggleArticulation";
import type { EditorSnapshot } from "../Command";
import { defaultInputState } from "../../input/InputState";

function makeSnapshot(): EditorSnapshot {
  return {
    score: factory.score("Test", "", [
      factory.part("P", "P", [
        factory.measure([factory.voice([factory.note("C", 4, factory.dur("quarter"))])]),
        factory.measure([factory.voice([])]),
      ]),
    ]),
    inputState: defaultInputState(),
  };
}

describe("Extended articulations", () => {
  const kinds = [
    "staccatissimo",
    "up-bow",
    "down-bow",
    "open-string",
    "stopped",
    "trill",
    "mordent",
    "turn",
  ] as const;

  for (const kind of kinds) {
    it(`adds ${kind} to a note`, () => {
      const snap = makeSnapshot();
      const cmd = new ToggleArticulation(kind);
      const result = cmd.execute(snap);
      const evt = result.score.parts[0].measures[0].voices[0].events[0];
      if (evt.kind === "note") {
        expect(evt.articulations).toEqual([{ kind }]);
      }
    });

    it(`toggles ${kind} off`, () => {
      const snap = makeSnapshot();
      const r1 = new ToggleArticulation(kind).execute(snap);
      const r2 = new ToggleArticulation(kind).execute(r1);
      const evt = r2.score.parts[0].measures[0].voices[0].events[0];
      if (evt.kind === "note") {
        expect(evt.articulations ?? []).toEqual([]);
      }
    });
  }
});
