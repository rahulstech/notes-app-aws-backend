import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { NoteItem, ShortNoteItem } from "./types";
import { pickExcept } from "@notes-app/common";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export function toNoteDBItem(item: NoteItem): Record<string,AttributeValue> {
    const dbitem: Record<string, any> = pickExcept(item,['medias']);
    if (!item.medias) {
        dbitem.medias = {};
    }
    return marshall(dbitem);
}

export function fromNoteDBItem(record: Record<string, AttributeValue>): NoteItem | ShortNoteItem {
    return unmarshall(record) as NoteItem | ShortNoteItem
}

export function toNotePublicRecord(note: NoteItem, short: boolean = false): Record<string,any> {
    const record: Record<string, any> = pickExcept(note,["PK","medias","content"]);
    if (!short) {
      record.content = note.content;
      record.medias = Object.values(note.medias || {}).map(media => pickExcept(media,['status']));
    }
    return record;
}