import { CreateNoteDataOutputItem, NoteItem, ShortNoteItem, toNotePublicRecord } from "@notes-app/database-service";
import { decodeBase64, encodeBase64, renameKeys } from "@notes-app/common";
import { NoteItemType } from "./types";

const SHORT_CONTENT_MAX_LENGTH = 60

export function createNoteShortContent(content: string): string {
    if (content.length > SHORT_CONTENT_MAX_LENGTH) {
        return content.substring(0,SHORT_CONTENT_MAX_LENGTH);
    }
    return content;
}

export function noteItemToNoteItemOutput(item: NoteItem): NoteItemType {
    return renameKeys(toNotePublicRecord(item), {"SK": "note_id"}) as NoteItemType;
}

export function noteItemToNoteItemOutputList(items: NoteItem[]): NoteItemType[] {
    return items.map(noteItemToNoteItemOutput)
}

export function createNoteDataOutputItemListToNoteItemOutputList(items: CreateNoteDataOutputItem[]): NoteItemType[] {
    return items.map(item => renameKeys(item,{ 'SK': 'note_id'}) as NoteItemType)
}

export function shortNoteItemToNoteItemOutput(item: ShortNoteItem): Omit<NoteItemType,'medias'> {
    return renameKeys(item, {"SK": "note_id"}) as NoteItemType
}

export function shortNoteItemToNoteItemOutputList(items: ShortNoteItem[]): Omit<NoteItemType,'medias'>[] {
    return items.map(shortNoteItemToNoteItemOutput)
}

export interface NoteMediaKeyParts {
    user_id: string;
    note_id: string;
    media_id?: string;
}

export function createNoteMediaKey(keyparts: NoteMediaKeyParts): string {
    const { user_id, note_id, media_id  } = keyparts;
    const parts = ['medias',user_id,note_id];
    const prefix = parts.join('/')+'/';
    if (media_id) {
        const encMId = encodeBase64(media_id);
        return `${prefix}${encMId}`;
    }
    return prefix;
}

export function splitNoteMediaKey(key: string): NoteMediaKeyParts {
    const [_,user_id,note_id,media_id] = key.split('/');
    return { user_id, note_id, media_id };
}