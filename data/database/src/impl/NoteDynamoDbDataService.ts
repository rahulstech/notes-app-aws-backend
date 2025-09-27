import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  BatchGetItemCommand,
  TransactWriteItemsCommand,
  DynamoDBClientConfig,
  BatchGetItemCommandInput,
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
import { createRecord, decodeBase64, encodeBase64, executeChunk, newAppErrorBuilder, pickExcept } from '@notes-app/common';
import { convertDynamoDbError, DYNAMODB_ERROR_CODES } from '../errors';
import { fromNoteDBItem, toNoteDBItem } from '../helpers';

const NOTE_ID_PREFIX = 'NID-';
const SK_NGID_NID_MAP = "_NGID_NID_MAP_";
const ATTRIBUTE_NGIDS_MAP = "ngids";
const NOTEITEM_PROJECTIONS = ['PK','SK','global_id','title','content','short_content','timestamp_created','timestamp_modified','medias'];
const SHORTNOTEITEM_PROJECTIONS = ['PK','SK','global_id','title','short_content','timestamp_created','timestamp_modified'];

export interface NoteDynamoDbDataServiceOptions {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localEndpointUrl?: string;
  notesTableName: string;
  maxMediasPerItem: number;
}

export class NoteDynamoDbDataService implements NoteDataService {
  private client: DynamoDBClient;
  private maxMediasPerItem: number;
  private notesTableName: string;

  constructor(options: NoteDynamoDbDataServiceOptions) {
    const { localEndpointUrl, region, accessKeyId, secretAccessKey } = options;
    
    const isLocal = !!localEndpointUrl;
    const isRemote = !!region && !!accessKeyId && !!secretAccessKey;

    if (!isLocal && !isRemote) {
      throw newAppErrorBuilder()
            .setHttpCode(500)
            .setCode(DYNAMODB_ERROR_CODES.CONFIGURATION_ERROR)
            .addDetails("neither local nor remote configuration for dynamodb client provided")
            .setOperational(false)
            .build();
    }

    const config: DynamoDBClientConfig = {}
    if (isLocal) {
      config.endpoint = localEndpointUrl
    }
    else {
      config.region = region;
      config.credentials = { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!}
    }

    const client = new DynamoDBClient(config);
    this.client = client;
    this.maxMediasPerItem = options.maxMediasPerItem;
    this.notesTableName = options.notesTableName;
  }

  private createNoteId(): string {
    return `${NOTE_ID_PREFIX}${randomUUID()}`;
  }

  // create notes

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
      const newNotes = await Promise.all(Object.values(gidNote).map(async (input) => {
        const note = {
          PK,
          SK: this.createNoteId(),
          ...input,
        }
        return await this.createSingleNote(note);
      }));

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
        const ngids: Record<string,string> = unmarshall(Item).ngids;
        const map: Record<string,string> = {};
        global_ids.forEach(gid => {
          const nid = ngids[gid];
          if (nid) {
            map[gid] = nid;
          }
        });
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
    const request: BatchGetItemCommandInput = {
      RequestItems: {
        [this.notesTableName]: {
          Keys: SKs.map((SK) => marshall({ PK, SK })),
        },
      },
    };

    try {
      const { Responses } = await this.client.send(new BatchGetItemCommand({
        RequestItems: {
          [this.notesTableName]: {
            Keys: SKs.map((SK) => marshall({ PK, SK })),
          },
        },
      }));
      if (Responses && Responses[this.notesTableName]) {
        const items = Responses[this.notesTableName];
        return items.map(item => pickExcept(fromNoteDBItem(item),['medias']) as CreateNoteDataOutputItem);
      }
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
    return [];
  }

  private async createSingleNote(note: NoteItem): Promise<CreateNoteDataOutputItem> {
    const cmd = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: this.notesTableName,
            Item: toNoteDBItem(note)
          }
        },
        {
          Update: {
            TableName: this.notesTableName,
            Key: marshall({PK: note.PK, SK: SK_NGID_NID_MAP}),
            UpdateExpression: `SET ${ATTRIBUTE_NGIDS_MAP}.#key = :value`,
            ExpressionAttributeNames: {
              "#key": note.global_id
            },
            ExpressionAttributeValues: marshall({
              ":value": note.SK
            })
          }
        }
      ]
    })
    try {
      await this.client.send(cmd);
      return note;
    }
    catch(error) {
      return {
        ...note,
        error: convertDynamoDbError(error)
      }
    }
  }

  // get all notes

  public async getNotes(PK: String, limit?: number, pageMark?: string): Promise<GetNotesOutput> {
    const Limit = Math.min(100,limit || 100); // get upto 100 items
    try {
      const {Items,LastEvaluatedKey} = await this.client.send(new QueryCommand({
        TableName: this.notesTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': PK,
        }),
        ProjectionExpression: SHORTNOTEITEM_PROJECTIONS.join(","),
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

  // get note by id

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

    throw newAppErrorBuilder()
          .setHttpCode(404)
          .setCode(DYNAMODB_ERROR_CODES.NOTE_NOT_FOUND)
          .addDetails(`note with PK = ${PK} and SK = ${SK} not found`)
          .setOperational(true)
          .setRetriable(false)
          .build();
  }

  // update notes

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
        ConditionExpression: "SK = :SK", // it ensures that update if and only if the item exists
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
        throw newAppErrorBuilder()
              .setHttpCode(404)
              .setCode(DYNAMODB_ERROR_CODES.NOTE_NOT_FOUND)
              .setRetriable(false)
              .build()
      }
      throw dberror;
    }
  }

  // delete notes

  public async deleteMultipleNotes(PK: string, SKs: string[]): Promise<DeleteMultipleNotesDataOutput> {
    const requests: WriteRequest[] = SKs.map(SK => ({
                                        DeleteRequest: {
                                          Key: marshall({PK,SK})
                                        }
                                      }));
    try {                                  
      const unprocessed: WriteRequest[] = await this.runBatchDeleteNotes(requests);
      const unsuccessful: string[] = unprocessed.map(({DeleteRequest}) => unmarshall(DeleteRequest!.Key!).SK);
      return { unsuccessful };
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
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

  // add medias

  public async addNoteMedias(PK: string, SK: string, inputs: NoteMediaItem[]): Promise<NoteMediaItem[]> {
    // get all the note medias
    const mediaItems: Record<string, NoteMediaItem> = await this.getNoteMedias(PK,SK);
    const currentMediaCount: number = Object.keys(mediaItems).length;

    // filter medias by media global_id which does not exist
    const { nonExistingMedias, existingMedias } = await this.filterMedias(inputs,mediaItems);

    if (nonExistingMedias.length > 0) {
      // adding new medias must not exceed the per note allowed max media count
      if (currentMediaCount + nonExistingMedias.length > this.maxMediasPerItem) {
        throw newAppErrorBuilder()
              .setHttpCode(400)
              .setCode(DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS)
              .addDetails({
                description: "total media count exceeds accepted media count",
                context: "addNoteMedias",
              })
              .setRetriable(false)
              .build();
      }

      // update note
      const newMedias = await this.updateNoteMedias(PK,SK,nonExistingMedias);
      return [...newMedias, ...existingMedias];
    }

    // all medias already existing, return those exising medias
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
      ExpressionAttributeNames[mediakeyname] = encodeBase64(media.global_id);
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
      // TODO: can Attributes be undefined while there is not UpdateItem error occurred?
      const { medias } = unmarshall(Attributes!);
      return Object.values(medias) as NoteMediaItem[];
    }
    catch(error){
      throw convertDynamoDbError(error);
    }
  }

  // get medias

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
    throw newAppErrorBuilder()
          .setHttpCode(404)
          .setCode(DYNAMODB_ERROR_CODES.NOTE_NOT_FOUND)
          .setRetriable(false)
          .build()
  }

  // update media staus

  public async updateMediaStatus(PK: string, SK: string, items: UpdateMediaStatusInputItem[]): Promise<void> {
    const UpdateExpressions: string[] = [];
    const ExpressionAttributeNames: Record<string, string> = {
      '#medias': 'medias',
      '#status': 'status'
    };
    const AttributeValues: Record<string, any> = {
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
        ConditionExpression: "SK = :SK",
        UpdateExpression: `SET ${UpdateExpressions.join(', ')}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues: marshall(AttributeValues),
      }));
    }
    catch(error) {
      throw convertDynamoDbError(error);
    }
  }

  // remove medias

  /**
   * 
   * @returns deleted media keys
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
        ExpressionAttributeNames: MediasAttributeNames,
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
      throw convertDynamoDbError(error)
    }

    // either note by SK or medias by mediaId not found
    return [];
  }
}
