import { describe, it, expect } from "vitest";
import { factory } from "../../model";
import { serializeToJson, deserializeFromJson } from "../json";

describe("grace note serialization", () => {
  it("round-trips grace notes", () => {
    const grace = factory.graceNote("C", 4, "sharp");
    const note = factory.note("D", 4, factory.dur("quarter"));
    const score = factory.score("Test", "", [
      factory.part("P", "P", [
        factory.measure([factory.voice([grace, note])]),
      ]),
    ]);

    const json = serializeToJson(score);
    const restored = deserializeFromJson(json);

    const events = restored.parts[0].measures[0].voices[0].events;
    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe("grace");
    if (events[0].kind === "grace") {
      expect(events[0].head.pitch.pitchClass).toBe("C");
      expect(events[0].head.pitch.accidental).toBe("sharp");
      expect(events[0].slash).toBe(true);
    }
  });

  it("round-trips appoggiatura (slash=false)", () => {
    const grace = factory.graceNote("E", 5, "natural", false);
    const note = factory.note("F", 5, factory.dur("quarter"));
    const score = factory.score("Test", "", [
      factory.part("P", "P", [
        factory.measure([factory.voice([grace, note])]),
      ]),
    ]);

    const json = serializeToJson(score);
    const restored = deserializeFromJson(json);

    const evt = restored.parts[0].measures[0].voices[0].events[0];
    expect(evt.kind).toBe("grace");
    if (evt.kind === "grace") {
      expect(evt.slash).toBe(false);
    }
  });
});

describe("pickup measure serialization", () => {
  it("round-trips pickup flag", () => {
    const m1 = factory.measure([factory.voice([factory.note("C", 4, factory.dur("quarter"))])]);
    m1.isPickup = true;
    const m2 = factory.measure([factory.voice([])]);
    const score = factory.score("Test", "", [factory.part("P", "P", [m1, m2])]);

    const json = serializeToJson(score);
    const restored = deserializeFromJson(json);

    expect(restored.parts[0].measures[0].isPickup).toBe(true);
    expect(restored.parts[0].measures[1].isPickup).toBeFalsy();
  });
});

describe("dynamic annotation serialization", () => {
  it("round-trips dynamic marks", () => {
    const note = factory.note("C", 4, factory.dur("quarter"));
    const m = factory.measure([factory.voice([note])], {
      annotations: [{ kind: "dynamic", level: "ff", noteEventId: note.id }],
    });
    const score = factory.score("Test", "", [factory.part("P", "P", [m])]);

    const json = serializeToJson(score);
    const restored = deserializeFromJson(json);

    const dynamics = restored.parts[0].measures[0].annotations.filter(
      (a) => a.kind === "dynamic",
    );
    expect(dynamics).toHaveLength(1);
    if (dynamics[0].kind === "dynamic") {
      expect(dynamics[0].level).toBe("ff");
    }
  });
});

describe("slur annotation serialization", () => {
  it("round-trips slur annotations", () => {
    const n1 = factory.note("C", 4, factory.dur("quarter"));
    const n2 = factory.note("D", 4, factory.dur("quarter"));
    const m = factory.measure([factory.voice([n1, n2])], {
      annotations: [{ kind: "slur", startEventId: n1.id, endEventId: n2.id }],
    });
    const score = factory.score("Test", "", [factory.part("P", "P", [m])]);

    const json = serializeToJson(score);
    const restored = deserializeFromJson(json);

    const slurs = restored.parts[0].measures[0].annotations.filter(
      (a) => a.kind === "slur",
    );
    expect(slurs).toHaveLength(1);
    expect(slurs[0].kind).toBe("slur");
  });
});
