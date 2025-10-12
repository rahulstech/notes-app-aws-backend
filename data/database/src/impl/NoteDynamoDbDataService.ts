import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  BatchGetItemCommand,
  TransactWriteItemsCommand,
  DynamoDBClientConfig,
  BatchWriteItemCommand,
  WriteRequest,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { NoteDataService } from '../NoteDataService';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  CreateNoteDataInputItem,
  CreateNoteDataOutputItem,
  DeleteMultipleNotesDataOutput,
  GetNoteIdsOutput,
  GetNotesOutput,
  NoteItem,
  NoteMediaItem,
  ShortNoteItem,
  UpdateMediaStatusInputItem,
  UpdateNoteDataInputItem,
  UpdateNoteDataOutputItem,
} from '../types';
import { randomUUID } from 'crypto';
import { APP_ERROR_CODE, createRecord, decodeBase64, encodeBase64, LOGGER, newAppErrorBuilder, pickExcept } from '@notes-app/common';
import { convertDynamoDbError, createNoteNotFoundError, createTooManyMediaItemError, DYNAMODB_ERROR_CODES } from '../errors';
import { fromNoteDBItem } from '../helpers';

const LOG_TAG = "NoteDynamoDbDataService";
const NOTE_ID_PREFIX = 'NID-';
const SK_NGID_NID_MAP = "_NGID_NID_MAP_";
const ATTRIBUTE_NGIDS_MAP = "ngids";
const NOTEITEM_PROJECTIONS = ['PK','SK','global_id','title','content','short_content','timestamp_created','timestamp_modified','medias'];
const SHORTNOTEITEM_PROJECTIONS = ['SK','global_id','title','short_content','timestamp_created','timestamp_modified'];

export interface NoteDynamoDbDataServiceOptions {
  client: DynamoDBClient,
  notesTableName: string;
  maxMediasPerItem: number;
}

export class NoteDynamoDbDataService implements NoteDataService {
  private client: DynamoDBClient;
  private maxMediasPerItem: number;
  private notesTableName: string;

  constructor(options: NoteDynamoDbDataServiceOptions) {
    this.client = options.client;
    this.maxMediasPerItem = options.maxMediasPerItem;
    this.notesTableName = options.notesTableName;
  }

  private createNoteId(): string {
    return `${NOTE_ID_PREFIX}${randomUUID()}`;
  }

  // create notes

  /**
   * Creates multiple notes. First it checks by note global for existing note.
   * Adds the notes for which global_id does not exists.
   * 
   * @param PK partision key i.e. user id
   * @param inputs array of notes
   * @returns newly created and matched exisiting notes
   */
  public async createMultipleNotes(PK: string, inputs: CreateNoteDataInputItem[]): Promise<CreateNoteDataOutputItem[]> {
    try {
      // create global_id => noteitem map
      const gidNote = createRecord<CreateNoteDataInputItem,string,CreateNoteDataInputItem>(inputs,note=>note.global_id,note=>note);
      
      // get exising notes by SK  
      const existingNotes: CreateNoteDataOutputItem[] = await this.getNotesByGlobalIds(PK,Object.keys(gidNote));

      // remove existing notes from map
      for (const {global_id} of existingNotes) {
        delete gidNote[global_id]
      }

      // add new notes
      const newNotes = await Promise.all(Object.values(gidNote).map(input => this.createSingleNote(PK,input)));

      return [...newNotes, ...existingNotes];
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
  }

  private async getNotesByGlobalIds(PK: string, global_ids: string[]): Promise<CreateNoteDataOutputItem[]> {
    // get the global_id note_id map
    const mapGidSK: Record<string,string> = await this.getNoteIdsForNoteGlobalIds(PK, global_ids);
    const SKs: string[] = Object.values(mapGidSK);

    // if not exists then add the map item and return empty
    if (SKs.length == 0) {
      return [];
    }

    // if exists get those note items by note_id
    return await this.getNotesByNoteIds(PK,SKs);
  }

  private async getNoteIdsForNoteGlobalIds(PK: string, global_ids: string[]): Promise<Record<string,string>> {
    try {
      // get the note global_id note_id map item
      const { Item } = await this.client.send(new GetItemCommand({
                                            TableName: this.notesTableName,
                                            Key: marshall({ PK, SK: SK_NGID_NID_MAP})
                                          }));
      if (Item) { 
        const { ngids } = unmarshall(Item);
        const map: Record<string,string> = {};
        for(const gid of global_ids) {
          if (ngids[gid]) {
            map[gid] = ngids[gid];
          }
        }
        return map;
      }

      // if no such item exists then add an empty map
      await this.client.send(new PutItemCommand({
        TableName: this.notesTableName,
        Item: marshall({ PK, SK: SK_NGID_NID_MAP, ngids: {} as Record<string,string> })
      }));
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }

    return {};
  }

  private async getNotesByNoteIds(PK: string, SKs: string[]): Promise<CreateNoteDataOutputItem[]> {
    try {
      const { Responses } = await this.client.send(new BatchGetItemCommand({
        RequestItems: {
          [this.notesTableName]: {
            Keys: SKs.map((SK) => marshall({ PK, SK })),
          },
        },
      }));
      if (Responses && Responses[this.notesTableName]) {
        const items = Responses[this.notesTableName]
                      .map(item => pickExcept(fromNoteDBItem(item),['PK','medias']) as CreateNoteDataOutputItem);
        return items;
      }
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
    return [];
  }

  private async createSingleNote(PK: string, input: CreateNoteDataInputItem): Promise<CreateNoteDataOutputItem> {
    const item = { ...input, PK, SK: this.createNoteId(), medias: {} };
    const cmd = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.notesTableName,
            Item: marshall(item)
          }
        },
        {
          Update: {
            TableName: this.notesTableName,
            Key: marshall({PK, SK: SK_NGID_NID_MAP}),
            UpdateExpression: `SET ${ATTRIBUTE_NGIDS_MAP}.#key = :value`,
            ExpressionAttributeNames: {
              "#key": input.global_id
            },
            ExpressionAttributeValues: marshall({
              ":value": item.SK
            })
          }
        }
      ]
    })
    try {
      await this.client.send(cmd);
      return pickExcept(item,['PK','medias']) as CreateNoteDataOutputItem;
    }
    catch(error) {
      return {
        ...input,
        error: convertDynamoDbError(error)
      }
    }
  }

  // get all notes

  /**
   * Get multiple notes upto given limit for the user. notes are sorted 
   * by timestamp_created in descending order.
   * 
   * @param PK partition key i.e. user id
   * @param limit max no of notes
   * @param pageMark the start of the next page
   * @returns array of found notes, requested limit and pageMark if more notes available
   */
  public async getNotes(PK: String, limit?: number, pageMark?: string): Promise<GetNotesOutput> {
    const Limit = Math.min(100,limit || 100); // get upto 100 items
    try {
      const {Items,LastEvaluatedKey} = await this.client.send(new QueryCommand({
        TableName: this.notesTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': PK,
        }),
        ProjectionExpression: "SK,global_id,title,short_content,timestamp_created,timestamp_modified",
        Limit,
        ExclusiveStartKey: pageMark && JSON.parse(decodeBase64(pageMark)),
        IndexName: 'OrderNoteByCreatedIndex', // use index to use different sort key for ordering
        ScanIndexForward: false, // false = order desc
      }));
      return {
        notes: Items?.map((Item) => {
          return fromNoteDBItem(Item) as ShortNoteItem;
        }) ?? [],
        limit: Limit,
        pageMark: LastEvaluatedKey && encodeBase64(JSON.stringify(LastEvaluatedKey)),
      };
    }
    catch(error) {
      throw convertDynamoDbError(error)
    }
  }

  public async getNoteIds(PK: string, limit: number, pageMark?: string): Promise<GetNoteIdsOutput> {
    try {
      const {Items,LastEvaluatedKey} = await this.client.send(new QueryCommand({
        TableName: this.notesTableName,
        KeyConditionExpression: "PK = :PK",
        ExpressionAttributeValues: marshall({
          ":PK": PK,
        }),
        ProjectionExpression: "SK",
        Limit: limit,
        ExclusiveStartKey: pageMark && JSON.parse(decodeBase64(pageMark)),
      }));
      if (Items) {
        return {
          SKs: Items.map(item => unmarshall(item).SK),
          limit,
          pageMark: LastEvaluatedKey && encodeBase64(JSON.stringify(LastEvaluatedKey)),
        }
      }
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
    return {
      SKs: [],
      limit,
    }
  }

  /**
   * Finds a note for the user by note id or throws AppError if not found.
   * 
   * @param PK partition key i.e. user id
   * @param SK sort key i.e. note id
   * @returns the note item
   * @throws AppError note not found
   *                  any error during query
   */
  public async getNoteById(PK: string, SK: string): Promise<NoteItem> {
    try {
      const { Item } = await this.client.send(new GetItemCommand({
        TableName: this.notesTableName,
        Key: marshall({PK,SK}),
      }));
      if (Item) {
        return fromNoteDBItem(Item) as NoteItem
      }
    }
    catch(error){
      throw convertDynamoDbError(error);
    }

    throw createNoteNotFoundError("getNoteById", {PK,SK});
  }

  /**
   * Updates a note
   * 
   * @param PK partition key i.e. user id
   * @param input 
   * @returns 
   * @throws AppError note note not found (code - APP_ERROR_CODE.NOT_FOUND)
   *                  any error occures during query
   */
  public async updateSingleNote(PK: string, input: UpdateNoteDataInputItem): Promise<UpdateNoteDataOutputItem> {
    const { SK } = input;
    const SetExpressions: string[] = [];
    const ExpressionAttributeValues: Record<string,any> = {
      ":SK": SK,
    };
    SetExpressions.push(`timestamp_modified = :timestamp_modified`);
    ExpressionAttributeValues[':timestamp_modified'] = input.timestamp_modified;
    if (input.title) {
      SetExpressions.push(`title = :title`);
      ExpressionAttributeValues[':title'] = input.title;
    }
    if (input.content) {
      SetExpressions.push(`content = :content`);
      SetExpressions.push('short_content = :short_content');
      ExpressionAttributeValues[':content'] = input.content;
      ExpressionAttributeValues[':short_content'] = input.short_content;
    }
    const UpdateExpression = `SET ${SetExpressions.join(", ")}`;

    try {
      const { Attributes } = await this.client.send(new UpdateItemCommand({
        TableName: this.notesTableName,
        Key: marshall({PK,SK}),
        UpdateExpression,
        ConditionExpression: "PK = :PK AND SK = :SK", // it ensures that update if and only if the item exists
        ExpressionAttributeValues: marshall(ExpressionAttributeValues),
        ReturnValues: 'UPDATED_NEW'
      }));
      return {
        SK,
        ...unmarshall(Attributes!), // TODO: can Attribute be undefined or null even if there is no error
      };
    }
    catch(error) {
      const dberror = convertDynamoDbError(error);
      if (dberror.code === DYNAMODB_ERROR_CODES.CONDITIONAL_CHECK_FAILED) { 
        throw createNoteNotFoundError("updateSingleNote",{PK,SK});
      }
      throw dberror;
    }
  }

  /**
   * Deletes multiple notes by id.
   * 
   * @param PK partition key i.e. user id
   * @param SKs array of sort keys i.e. note ids
   * @returns the note ids which are not deleted
   * @throws AppError if any error occures during query
   */
  public async deleteMultipleNotes(PK: string, SKs: string[]): Promise<DeleteMultipleNotesDataOutput> {
    const requests: WriteRequest[] = SKs.map(SK => ({
                                        DeleteRequest: {
                                          Key: marshall({PK,SK})
                                        }
                                      }));
    try {                                  
      const unprocessed: WriteRequest[] = await this.runBatchDeleteNotes(requests);
      if (unprocessed.length > 0) {
        return {
          unsuccessful: unprocessed.map(({DeleteRequest}) => unmarshall(DeleteRequest!.Key!).SK)
        }
      }
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
    return {};
  }

  private async runBatchDeleteNotes(requests: WriteRequest[], attempt: number = 1): Promise<WriteRequest[]> {
    if (attempt === 3) {
      return requests;
    }
    const unprocessed: WriteRequest[] = [];
    for (let i = 0; i < requests.length; i += 25) {
      const { UnprocessedItems } = await this.client.send(new BatchWriteItemCommand({
        RequestItems: {
          [this.notesTableName]: requests.slice(i,i+25)
        }
      }));
      if (UnprocessedItems && UnprocessedItems[this.notesTableName]) {
        unprocessed.push(...UnprocessedItems[this.notesTableName]);
      }
    }
    return await this.runBatchDeleteNotes(unprocessed, ++attempt);
  }

  //////////////////////////////////////////////
  ///               Note Media              ///
  ////////////////////////////////////////////

  /**
   * Adds new medias for the note. At first it filters the medias by media global id.
   * Only those medias are added for which media global id does not exists. Each media
   * allows a max number of medias. If total media count exceeds that number then 
   * none of the medias is added.
   * 
   * @param PK partition key i.e. user id
   * @param SK sort key i.e. note id
   * @param inputs medias to add
   * @returns array of medias which are newly added and the matched exising ones
   * @throws AppError if any error occures during query
   */
  public async addNoteMedias(PK: string, SK: string, inputs: NoteMediaItem[]): Promise<NoteMediaItem[]> {
    // get all the note medias for the note
    const mediaItems: Record<string, NoteMediaItem> = await this.getNoteMedias(PK,SK);
    const currentMediaCount: number = Object.keys(mediaItems).length;

    // separate medias by existing and non-existing by media global_id
    const { nonExistingMedias, existingMedias } = await this.filterMedias(inputs,mediaItems);

    LOGGER.logDebug("", { tag: LOG_TAG, method: "addNoteMedias", PK, SK, existingMedias, nonExistingMedias });

    if (nonExistingMedias.length > 0) {
      // adding new medias must not exceed the per note allowed max media count
      if (currentMediaCount + nonExistingMedias.length > this.maxMediasPerItem) {
        throw createTooManyMediaItemError("addMedias",{PK,SK});
      }

      // update note
      const newMedias = await this.updateNoteMedias(PK,SK,nonExistingMedias);

      // return newly added and matched existing medias
      return [...newMedias, ...existingMedias];
    }

    // all medias already exist, return those matched exising medias only
    return [...existingMedias];
  }

  private async filterMedias(inputs: NoteMediaItem[], mediaItems: Record<string, NoteMediaItem>): Promise<{ existingMedias: NoteMediaItem[]; nonExistingMedias: NoteMediaItem[]; }> {
    if (Object.keys(mediaItems).length === 0) {
      return { existingMedias: [], nonExistingMedias: inputs };
    }

    const nonExistingMedias: NoteMediaItem[] = [];
    const existingMedias: NoteMediaItem[] = [];
    inputs.forEach(media => {
      if (mediaItems[media.media_id]) {
        existingMedias.push(media);
      }
      else {
        nonExistingMedias.push(media);
      }
    });

    return { existingMedias, nonExistingMedias };
  }

  private async updateNoteMedias(PK: string, SK: string, medias: NoteMediaItem[]): Promise<NoteMediaItem[]> {
    const UpdateExpressions: string[] = [];
    const ExpressionAttributeValues: Record<string,any> = {};
    const ExpressionAttributeNames: Record<string,string> = {};
    medias.forEach((media,index) => {
      const mediakeyname = `#mediakey${index}`;
      const mediavalname = `:mediaval${index}`;
      UpdateExpressions.push(`medias.${mediakeyname} = ${mediavalname}`);
      ExpressionAttributeNames[mediakeyname] = media.media_id;
      ExpressionAttributeValues[mediavalname] = media;
    })
    const UpdateExpression = `SET ${UpdateExpressions.join(", ")}`;
    try {
      // no need to check for item exists here. because at this point it is garunteed that the note item exists.
      const { Attributes } = await this.client.send(new UpdateItemCommand({
        TableName: this.notesTableName,
        Key: marshall({PK,SK}),
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues: marshall(ExpressionAttributeValues),
        ReturnValues: 'UPDATED_NEW'
      }));
      const { medias: savedMedias } = unmarshall(Attributes!);
      // with ReturnValue = 'UDATED_NEW' it returns the whole medias attribute of note after update
      // not just those which are added to medias. therefore need to filter those newly added media item 
      // and returns those only from this method
      const result: NoteMediaItem[] = [];
      for (const media of medias) {
        result.push(savedMedias[media.media_id]);
      }
      return result;
    }
    catch(error){
      throw convertDynamoDbError(error);
    }
  }

  /**
   * Get all medias of the note as map of media id to media.
   * 
   * @param PK partition key i.e. user id
   * @param SK sort key i.e. note id
   * @returns a map of media id and media item
   * @throws AppError note not found
   *                  any error during query
   */
  public async getNoteMedias(PK: string, SK: string): Promise<Record<string,NoteMediaItem>> {
    try {
      const { Items } = await this.client.send(new QueryCommand({
        TableName: this.notesTableName,
        KeyConditionExpression: "PK = :PK AND SK = :SK",
        ExpressionAttributeValues: marshall({
          ":PK": PK,
          ":SK": SK
        }),
        ProjectionExpression: "medias",
        Limit: 1,
      }));
      if (Items && Items.length > 0) {
        return unmarshall(Items[0]).medias as Record<string,NoteMediaItem>;
      }
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
    throw createNoteNotFoundError("getNoteMedias", {PK,SK});
  }

  /**
   * Update media when successfully uploaded to the storage.
   * 
   * @param PK partition key i.e. user id
   * @param SK sort key i.e. note id
   * @param items media item update details
   * @throws AppError note not foud
   *                  any error occures during query
   */
  public async updateMediaStatus(PK: string, SK: string, items: UpdateMediaStatusInputItem[]): Promise<void> {
    const UpdateExpressions: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {
      '#medias': 'medias',
      '#status': 'status'
    };
    const AttributeValues: Record<string, any> = {
      ":PK": SK,
      ":SK": SK,
    };
    items.forEach(({media_id,status}, index) => {
      const kname = `#mediakey${index}`;
      const vname = `:mediaval${index}`;
      UpdateExpressions.push(`#medias.${kname}.#status = ${vname}`);
      ExpressionAttributeNames[kname] = media_id;
      AttributeValues[vname] = status;
    });

    try {
      await this.client.send(new UpdateItemCommand({
        TableName: this.notesTableName,
        Key: marshall({ PK, SK }),
        ConditionExpression: "PK = :PK AND SK = :SK",
        UpdateExpression: `SET ${UpdateExpressions.join(', ')}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues: marshall(AttributeValues),
      }));
    }
    catch(error) {
      const dberror = convertDynamoDbError(error);
      if (dberror.code === DYNAMODB_ERROR_CODES.CONDITIONAL_CHECK_FAILED) {
        throw createNoteNotFoundError("updateMediaStatus",{PK,SK});
      }
      throw dberror;
    }
  }

  /**
   * Remove medias of the note by media ids
   * 
   * @returns deleted media keys
   * @throws AppError note not found
   *                  any error occures during query
   */
  public async removeNoteMedias(PK: string, SK: string, mediaIds: string[]): Promise<string[]> {
    try {
      const UpdateExpressions: string[] = [];
      const MediasAttributeNames: Record<string,string> = {};
      mediaIds.forEach((media_id,index) => {
        const keyname = `#mediakey${index}`;
        UpdateExpressions.push(`medias.${keyname}`);
        MediasAttributeNames[keyname] = media_id;
      });
      
      const { Attributes } = await this.client.send(new UpdateItemCommand({
        TableName: this.notesTableName,
        Key: marshall({PK,SK}),
        UpdateExpression: `REMOVE ${UpdateExpressions.join(", ")}`,
        ConditionExpression: "PK = :PK AND SK = :SK",
        ExpressionAttributeNames: MediasAttributeNames,
        ExpressionAttributeValues: marshall({
          ":PK": PK,
          ":SK": SK
        }),
        ReturnValues: 'UPDATED_OLD'
      }));

      // return the deleted keys
      if (Attributes) {
        const mediaIdSet = new Set<string>(mediaIds);
        // Attribute contains the medias attribute before delete, not just the delete medias
        // therefore need to filter Attribute.medias
        const medias: Record<string,NoteMediaItem> = unmarshall(Attributes).medias;
        return Object.values(medias).filter(({media_id}) => mediaIdSet.has(media_id)).map(({key}) => key);
      }
    }
    catch(error) {
      const dberror = convertDynamoDbError(error);
      if (dberror.code === DYNAMODB_ERROR_CODES.CONDITIONAL_CHECK_FAILED) {
        throw createNoteNotFoundError("removeNoteMedias",{PK,SK});
      }
      throw dberror;
    }

    // either note by SK or medias by mediaId not found
    return [];
  }
}
