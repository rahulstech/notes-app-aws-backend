import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { NoteMediaItem } from '../types';
import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { pickExcept } from '@notes-app/common';

const SHORT_CONTENT_MAX_LENGTH = 60

export class NoteItem {
  constructor(
    public PK: string,
    public SK: string,
    public global_id: string,
    public title: string,
    public content: string,
    public short_content: string,
    public timestamp_created: number,
    public timestamp_modified: number,
    public medias?: Record<string, NoteMediaItem>,
    public mgids?: Record<string,string | null>
  ) {}

  public toPublicRecord(short: boolean = false): Record<string,any> {
    const note: Record<string, any> = pickExcept(this,["PK","medias","content","mgids"]);
    if (!short) {
      note.content = this.content;
      note.medias = Object.values(this.medias || {});
    }
    return note;
  }

  public toDBItem(): Record<string, any> {
    const Item: Record<string, any> = { ...this };
    if (!this.medias) {
      Item.medias = {}
      Item.mgids = {}
    }
    return marshall(Item);
  }

  public static fromDBItem(record: Record<string, AttributeValue>): NoteItem {
    const item = unmarshall(record)
    return new NoteItem(
      item.PK,
      item.SK,
      item.global_id,
      item.title,
      item.content,
      item.short_content,
      item.timestamp_created,
      item.timestamp_modified,
      item.medias,
      item.mgids
    );
  }

  public static createShortContent(content: string): string {
    if (content.length > SHORT_CONTENT_MAX_LENGTH) {
      return content.substring(0,SHORT_CONTENT_MAX_LENGTH);
    }
    return content;
  }
}

export const NOTE_ITEM_PROJECTIONS = ['PK','SK','title','content','short_content','timestamp_created','timestamp_modified','medias','mgids']
