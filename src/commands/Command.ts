import type { Score } from "../model";
import type { InputState } from "../input/InputState";

export interface EditorSnapshot {
  score: Score;
  inputState: InputState;
}

export interface Command {
  execute(state: EditorSnapshot): EditorSnapshot;
  undo(state: EditorSnapshot): EditorSnapshot;
  description: string;
}
