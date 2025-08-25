import { NoteItem, ShortNoteItem } from "@notes-app/database-service";
import { NoteItemOutput } from "./types";
import { pickExcept, renameKeys } from "@notes-app/common";


export function noteItemToNoteItemOutput(item: NoteItem): NoteItemOutput {
    return renameKeys(item.toPublicRecord(), {"SK": "note_id"}) as NoteItemOutput
}

export function noteItemToNoteItemOutputList(items: NoteItem[]): NoteItemOutput[] {
    return items.map(noteItemToNoteItemOutput)
}

export function shortNoteItemToNoteItemOutput(item: ShortNoteItem): NoteItemOutput {
    return renameKeys(item.toPublicRecord(true), {"SK": "note_id"}) as NoteItemOutput
}

export function shortNoteItemToNoteItemOutputList(items: ShortNoteItem[]): NoteItemOutput[] {
    return items.map(shortNoteItemToNoteItemOutput)
}