import type { Command, EditorSnapshot } from "./Command";

export class CommandHistory {
  private undoStack: { command: Command; before: EditorSnapshot }[] = [];
  private redoStack: { command: Command; before: EditorSnapshot }[] = [];

  execute(command: Command, state: EditorSnapshot): EditorSnapshot {
    const before = structuredClone(state);
    const after = command.execute(state);
    this.undoStack.push({ command, before });
    this.redoStack = [];
    return after;
  }

  undo(currentState: EditorSnapshot): EditorSnapshot | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ command: entry.command, before: currentState });
    return entry.before;
  }

  redo(currentState: EditorSnapshot): EditorSnapshot | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    const after = entry.command.execute(currentState);
    this.undoStack.push({ command: entry.command, before: currentState });
    return after;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
