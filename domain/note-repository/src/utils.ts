import { NoteItem, ShortNoteItem } from "@notes-app/database-service";
import { NoteItemOutput } from "./types";
import { decodeBase64, encodeBase64, renameKeys } from "@notes-app/common";
import path = require("node:path");

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

export function createNoteMediaKey(user_id: string, note_id: string, media_group_id?: string): string {
    const parts = ['medias',user_id,note_id]
    if (media_group_id) {
        parts.push(encodeBase64(media_group_id))
    }
    return path.posix.join(...parts)
}

export interface SplitNoteMediaKeyOutput {
    user_id: string;
    note_id: string;
    media_global_id?: string;
}

export function splitNoteMediaKey(key: string): SplitNoteMediaKeyOutput {
    const [_,user_id,note_id,enc_mgid] = key.split('/')
    const media_global_id = enc_mgid ? decodeBase64(enc_mgid) : undefined
    return { user_id, note_id, media_global_id }
}