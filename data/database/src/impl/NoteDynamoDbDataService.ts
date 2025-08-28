import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  BatchGetItemCommand,
  TransactWriteItemsCommand,
  BatchWriteItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { NOTE_ITEM_PROJECTIONS, NoteItem } from '../model/Note';
import { NoteDataService } from '../NoteDataService';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  CreateNoteDataOutput,
  NoteMediaItem,
  ShortNoteItem,
  UpdateNoteDataInput,
  UpdateNoteDataOutput,
} from '../types';
import { randomUUID } from 'crypto';
import { pickExcept } from '@notes-app/common';

const TABLE_USER_NOTES = 'user_notes';
const NOTE_ID_PREFIX = 'NID';
const SK_NGID_NID_MAP = "_NGID_NID_MAP_"
const ATTRIBUTE_NGIDS_MAP = "ngids"

type PartialNoteMediaItem = Partial<NoteMediaItem>

type PartialNoteItem = Partial<Omit<InstanceType<typeof NoteItem>,'medias'>> & { medias?: Record<string,PartialNoteMediaItem> }

export interface DynamoDBClientOptions {
  maxMediasPerItem: number
}

export class NoteDynamoDbDataService implements NoteDataService {
  private client: DynamoDBClient;
  private maxMediasPerItem: number

  constructor(options: DynamoDBClientOptions) {
    const client = new DynamoDBClient({
      endpoint: 'http://localhost:8000',
    });
    this.client = client;
    this.maxMediasPerItem = options.maxMediasPerItem
  }

  public createNoteId(): string {
    return `${NOTE_ID_PREFIX}-${randomUUID()}`;
  }

  public async createMultipleNotes(PK: string, notes: NoteItem[]): Promise<CreateNoteDataOutput> {

    const gid_note: Record<string,NoteItem> = notes.reduce<Record<string,NoteItem>>((acc,note)=>{
      acc[note.global_id] = note
      return acc
    },{})

    const existing_notes: NoteItem[] = await this.getNotesByGlobalIds(PK, Object.keys(gid_note))

    // remove existing notes from new notes
    existing_notes.forEach(note => {
      delete gid_note[note.global_id]
    })

    // put filted items
    const promises = Object.values(gid_note).map(async (note) => {
      const cmd = new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_USER_NOTES,
              Item: note.toDBItem()
            }
          },
          {
            Update: {
              TableName: TABLE_USER_NOTES,
              Key: marshall({PK,SK: SK_NGID_NID_MAP}),
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
        await this.client.send(cmd)
        return note
      }
      catch(error) {
        console.log(error) // TODO: remove log
        return null
      }
    })

    const new_notes = (await Promise.all(promises)).filter(note => note !== null)
    
    return { items: [ ...existing_notes, ...new_notes] };
  }

  private async getNotesByGlobalIds(PK: string, global_ids: string[]): Promise<NoteItem[]> {
    try {
      
      // get the global_id note_id map
      const ngid_nid_map = await this.getNoteIdsForNoteGlobalIds(PK, global_ids)

      // if not exists then add the map item and return empty
      if (null == ngid_nid_map) {
        return []
      }

      // if exists get those note items by note_id
      return (await this.getNotesByNoteIds(PK,Object.values(ngid_nid_map))) as NoteItem[]
    }
    catch(error) {
      throw error
    }
  }

  private async getNoteIdsForNoteGlobalIds(PK: string, global_ids: string[]): Promise<Record<string,string> | null> {
    const ExpressionAttributeNames: Record<string,string> = {}
    const ProjectionExpression: string = global_ids.map((gid,index) => {
      const keyname = `#gid${index}`
      ExpressionAttributeNames[keyname] = gid
      return `ngids.${keyname}`
    }).join(", ")

    const getCmd = new GetItemCommand({
      TableName: TABLE_USER_NOTES,
      Key: marshall({ PK, SK: SK_NGID_NID_MAP }),
      ProjectionExpression,
      ExpressionAttributeNames
    })

    const { Item } = await this.client.send(getCmd)
    if (!Item) { 
      const putCmd = new PutItemCommand({
        TableName: TABLE_USER_NOTES,
        Item: marshall({ PK, SK: SK_NGID_NID_MAP, ngids: {} as Record<string,string> })
      })
      
      await this.client.send(putCmd)

      return null
    }

    return unmarshall(Item).ngids

  }

  public async getNotes(PK: String): Promise<ShortNoteItem[]> {
    const cmd = new QueryCommand({
      TableName: TABLE_USER_NOTES,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': PK,
        ':sk': NOTE_ID_PREFIX,
      }),
      ProjectionExpression: pickExcept(NOTE_ITEM_PROJECTIONS,["medias"]).join(",")
    });
    const {Items} = await this.client.send(cmd);
    return (
      Items?.map((Item) => {
        return NoteItem.fromDBItem(Item) as ShortNoteItem;
      }) ?? []
    );
  }

  public async getNoteById(PK: string, SK: string): Promise<NoteItem | null> {
    const cmd = new GetItemCommand({
      TableName: TABLE_USER_NOTES,
      Key: marshall({PK,SK}),
    });
    const { Item } = await this.client.send(cmd);
    return Item ? NoteItem.fromDBItem(Item) : null;
  }

  public async getNoteMediasByKeys(PK: string, SK: string, keys: string[]): Promise<NoteMediaItem[]> {
    const ProjectionAttributeNames: Record<string,string> = {}
    const ProjectionExpression = keys.map((key,index) => {
      const keyname = `#key${index}`
      ProjectionAttributeNames[keyname] = key
      return `medias.${keyname}`
    }).join(",")
    
    const notes: PartialNoteItem[] = await this.getNotesByNoteIds(PK,[SK],ProjectionExpression,ProjectionAttributeNames)

    return notes.reduce<NoteMediaItem[]>((acc, note) => {
      return [...acc, ...Object.values(note.medias || {}) as NoteMediaItem[]]
    }, [])
  }

  public async updateMediaStatus(
    PK: string,
    SK: string,
    items: Pick<NoteMediaItem,'global_id'|'key'|'status'>[]
  ): Promise<void> {
    const ExpressionAttributeNames: Record<string, string> = {
      '#status': 'status',
      '#medias': 'medias',
      '#mgids': 'mgids'
    };
    const AttributeValues: Record<string, any> = {};
    const updateExpressions: string[] = [];

    items.forEach(({global_id,key,status}, index) => {
      const mediakeyname = `#mediakey${index}`
      const mediavalname = `:mediaval${index}`
      updateExpressions.push(`#medias.${mediakeyname}.#status = ${mediavalname}`);
      ExpressionAttributeNames[mediakeyname] = key
      AttributeValues[mediavalname] = status

      const mgidskeyname = `#mgidskey${index}`
      const mgidsvalname = `:mgidsval${index}`
      updateExpressions.push(`#mgids.${mgidskeyname} = ${mgidsvalname}`);
      ExpressionAttributeNames[mgidskeyname] = global_id
      AttributeValues[mgidsvalname] = key
    });

    const UpdateExpression = `SET ${updateExpressions.join(', ')}`;

    const cmd = new UpdateItemCommand({
      TableName: TABLE_USER_NOTES,
      Key: marshall({ PK, SK }),
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues: marshall(AttributeValues),
    });

    await this.client.send(cmd);
  }

  public async updateMultipleNotes(PK: string,inputs: UpdateNoteDataInput[]): Promise<UpdateNoteDataOutput> {
    const promises = inputs.map(async (input) => {
      const SetExpressions: string[] = []
      const ExpressionAttributeValues: Record<string,any> = {}
      SetExpressions.push(`timestamp_modified = :timestamp_modified`)
      ExpressionAttributeValues[':timestamp_modified'] = input.timestamp_modified
      if (input.title) {
        SetExpressions.push(`title = :title`)
        ExpressionAttributeValues[':title'] = input.title
      }
      if (input.content) {
        SetExpressions.push(`content = :content`);
        SetExpressions.push('short_content = :short_content');
        ExpressionAttributeValues[':content'] = input.content
        ExpressionAttributeValues[':short_content'] = NoteItem.createShortContent(input.content)
      }
      const UpdateExpression = `SET ${SetExpressions.join(", ")}`

      try {
        const cmd = new UpdateItemCommand({
          TableName: TABLE_USER_NOTES,
          Key: marshall({PK,SK: input.SK}),
          UpdateExpression,
          ExpressionAttributeValues: marshall(ExpressionAttributeValues),
          ReturnValues: 'ALL_NEW'
        })
        const { Attributes } = await this.client.send(cmd)
        return NoteItem.fromDBItem(Attributes!)
      }
      catch(error) {
        console.log(error) // TODO: remove console log
        return null
      }
    })

    const items = (await Promise.all(promises))
                  .filter(note => null !== note) // TODO: need to add the errors

    return { items }
  }

  public async addNoteMedias(PK: string, SK: string, medias: NoteMediaItem[]): Promise<NoteMediaItem[]> {

    const newMedias: NoteMediaItem[] = await this.filterNewMedias(PK,SK,medias)

    const permitedMediaCount: number = this.maxMediasPerItem - newMedias.length
    const UpdateExpressions: string[] = []
    const ConditionExpression = `size(#medias) <= :permitedMediaCount`
    const ExpressionAttributeValues: Record<string,any> = {
      ":permitedMediaCount": permitedMediaCount
    }
    const ExpressionAttributeNames: Record<string,string> = {
      '#medias': "medias",
      '#mgids': 'mgids'
    }
    newMedias.forEach((media,index) => {
      const mediakeyname = `#mediakey${index}`
      const mediavalname = `:mediaval${index}`
      UpdateExpressions.push(`#medias.${mediakeyname} = ${mediavalname}`)
      ExpressionAttributeNames[mediakeyname] = media.key
      ExpressionAttributeValues[mediavalname] = media

      const mgidskeyname = `#mgids${index}`
      const mgidsvalname = `:mgidsval${index}`
      UpdateExpressions.push(`#mgids.${mgidskeyname} = ${mgidsvalname}`)
      ExpressionAttributeNames[mgidskeyname] = media.global_id
      ExpressionAttributeValues[mgidsvalname] = null
    })
    const UpdateExpression = `SET ${UpdateExpressions.join(", ")}`
    const cmd = new UpdateItemCommand({
      TableName: TABLE_USER_NOTES,
      Key: marshall({PK,SK}),
      UpdateExpression,
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues: marshall(ExpressionAttributeValues),
    })
    await this.client.send(cmd)
    return medias
  }

  private async filterNewMedias(PK: string, SK: string, medias: NoteMediaItem[]): Promise<NoteMediaItem[]> {
    const notes = await this.getNotesByNoteIds(PK,[SK],'mgids')
    if (notes.length === 0) {
      // note does not exists
      return []
    }
    const mediaGIds: Record<string,string|null> | undefined = notes[0].mgids
    if (!mediaGIds) {
      return medias
    }
    return medias.filter(media => !mediaGIds[media.global_id])
  }

  public async removeNoteMedias(PK: string, SK: string, keyGids: Pick<NoteMediaItem,'global_id'|'key'>[]): Promise<string[]> {
    const keys: string[] = []
    const UpdateExpressions: string[] = []
    const ExpressionAttributeNames: Record<string,string> = {}
    keyGids?.forEach(({key,global_id},index) => {
      const mediakeyname = `#mediakey${index}`
      UpdateExpressions.push(`medias.${mediakeyname}`)
      ExpressionAttributeNames[mediakeyname] = key

      const mgidskeyname = `#mgidskey${index}`
      UpdateExpressions.push(`mgids.${mgidskeyname}`)
      ExpressionAttributeNames[mgidskeyname] = global_id

      keys.push(key)
    })
    const UpdateExpression = `REMOVE ${UpdateExpressions.join(", ")}`
    try {
      const cmd = new UpdateItemCommand({
        TableName: TABLE_USER_NOTES,
        Key: marshall({PK,SK}),
        UpdateExpression,
        ExpressionAttributeNames,
      })
      await this.client.send(cmd)
      
      // retrun keys with media status AVAILABLE
      return keys
    }
    catch(error) {
      console.log(error) // TODO: remove console log
    }
    return []
  }

  public async deleteMultipleNotes(PK: string, SKs: string[]): Promise<string[]> {
    const cmd = new BatchWriteItemCommand({
      RequestItems: {
        [TABLE_USER_NOTES]: SKs.map(SK => {
          return {
            DeleteRequest: {
              Key: marshall({PK,SK})
            }
          }
        })
      }
    })

    const { UnprocessedItems } = await this.client.send(cmd)
    return UnprocessedItems?.[TABLE_USER_NOTES]?.map(request => unmarshall(request.DeleteRequest!.Key!).SK) || []
}

  private async getNotesByNoteIds(
    PK: string,
    SKs: string[],
    ProjectionExpression?: string,
    ExpressionAttributeNames?: Record<string, string>
  ): Promise<PartialNoteItem[]> {
    const cmd = new BatchGetItemCommand({
      RequestItems: {
        [TABLE_USER_NOTES]: {
          Keys: SKs.map((SK) => marshall({ PK, SK })),
          ProjectionExpression,
          ExpressionAttributeNames,
        },
      },
    });

    const { Responses } = await this.client.send(cmd);
    return (Responses?.[TABLE_USER_NOTES]?.map(response => unmarshall(response)) || []) as PartialNoteItem[]
  }
}
