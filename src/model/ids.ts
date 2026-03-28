import { nanoid } from "nanoid";

export type ScoreId = string & { __brand: "ScoreId" };
export type PartId = string & { __brand: "PartId" };
export type MeasureId = string & { __brand: "MeasureId" };
export type VoiceId = string & { __brand: "VoiceId" };
export type NoteEventId = string & { __brand: "NoteEventId" };

export function newId<T extends string>(prefix: string): T {
  return `${prefix}_${nanoid(10)}` as T;
}
