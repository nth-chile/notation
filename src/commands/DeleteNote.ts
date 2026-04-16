import type { Command, EditorSnapshot } from "./Command";
import type { Annotation } from "../model/annotations";
import type { NoteEventId } from "../model/ids";

/** Remove annotations that reference a deleted event ID. */
function removeAnnotationsForEvent(annotations: Annotation[], eventId: NoteEventId): Annotation[] {
  return annotations.filter((a) => {
    switch (a.kind) {
      case "chord-symbol":
      case "lyric":
      case "dynamic":
        return a.noteEventId !== eventId;
      case "hairpin":
      case "slur":
        return a.startEventId !== eventId && a.endEventId !== eventId;
      default:
        return true;
    }
  });
}

export class DeleteNote implements Command {
  description = "Delete note";

  execute(state: EditorSnapshot): EditorSnapshot {
    const score = structuredClone(state.score);
    const input = structuredClone(state.inputState);
    const { partIndex, measureIndex, voiceIndex, eventIndex } = input.cursor;

    const measure = score.parts[partIndex]?.measures[measureIndex];
    const voice = measure?.voices[voiceIndex];
    if (!voice || !measure) return state;

    // Delete the event at cursor, or the one before if at append position
    const deleteIndex = eventIndex < voice.events.length
      ? eventIndex
      : voice.events.length - 1;

    if (deleteIndex < 0) return state;

    // If a specific chord head is selected, remove just that head. Collapse the
    // chord to a plain note if only one head remains; delete the event entirely
    // if none remain.
    const headIdx = input.selectedHeadIndex;
    const targetEvent = voice.events[deleteIndex];
    if (
      headIdx != null &&
      targetEvent?.kind === "chord" &&
      headIdx >= 0 &&
      headIdx < targetEvent.heads.length
    ) {
      targetEvent.heads.splice(headIdx, 1);
      if (targetEvent.heads.length === 1) {
        voice.events[deleteIndex] = {
          kind: "note",
          id: targetEvent.id,
          duration: targetEvent.duration,
          head: targetEvent.heads[0],
          stemDirection: targetEvent.stemDirection,
          tabInfo: targetEvent.tabInfo,
          articulations: targetEvent.articulations,
          tuplet: targetEvent.tuplet,
          renderStaff: targetEvent.renderStaff,
        };
        input.selectedHeadIndex = null;
      } else if (targetEvent.heads.length === 0) {
        measure.annotations = removeAnnotationsForEvent(measure.annotations, targetEvent.id);
        voice.events.splice(deleteIndex, 1);
        input.cursor.eventIndex = Math.min(deleteIndex, voice.events.length);
        input.selectedHeadIndex = null;
      } else {
        // Keep head index in range.
        input.selectedHeadIndex = Math.min(headIdx, targetEvent.heads.length - 1);
      }
      return { score, inputState: input };
    }

    // Clean up annotations that reference this event
    measure.annotations = removeAnnotationsForEvent(measure.annotations, targetEvent.id);

    voice.events.splice(deleteIndex, 1);
    input.cursor.eventIndex = Math.min(deleteIndex, voice.events.length);
    input.selectedHeadIndex = null;
    return { score, inputState: input };
  }

  undo(state: EditorSnapshot): EditorSnapshot {
    return state;
  }
}
