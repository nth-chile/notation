import type { Command, EditorSnapshot } from "./Command";

export class CommandHistory {
  private undoStack: { command: Command; before: EditorSnapshot }[] = [];
  private redoStack: { command: Command; before: EditorSnapshot }[] = [];
  private transactionStart: EditorSnapshot | null = null;
  private transactionStackSize = 0;
  private transactionDepth = 0;

  beginTransaction(state: EditorSnapshot): void {
    if (this.transactionDepth === 0) {
      this.transactionStart = structuredClone(state);
      this.transactionStackSize = this.undoStack.length;
    }
    this.transactionDepth++;
  }

  endTransaction(): void {
    this.transactionDepth--;
    if (this.transactionDepth === 0 && this.transactionStart) {
      const added = this.undoStack.length - this.transactionStackSize;
      if (added > 1) {
        const last = this.undoStack[this.undoStack.length - 1];
        this.undoStack.splice(this.transactionStackSize, added, {
          command: last.command,
          before: this.transactionStart,
        });
      } else if (added === 1) {
        this.undoStack[this.transactionStackSize].before = this.transactionStart;
      }
      this.transactionStart = null;
    }
  }

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
