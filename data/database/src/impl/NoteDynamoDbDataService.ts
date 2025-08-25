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
  DynamoDBClientOptions,
  NoteMediaItem,
  NoteMediaStatus,
  ShortNoteItem,
  UpdateNoteDataInput,
  UpdateNoteDataOutput,
  UserNotesPrimaryKey,
} from '../types';
import { randomUUID } from 'crypto';
import { string } from 'joi';
import { AppError, AppErrorBuilder, newAppErrorBuilder, pickExcept } from '@notes-app/common';

const TABLE_USER_NOTES = 'user_notes';
const NOTE_ID_PREFIX = 'NID';
const SK_NGID_NID_MAP = "_NGID_NID_MAP_"
const ATTRIBUTE_NGIDS_MAP = "ngids"

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
    
    const notes: Partial<NoteItem>[] = await this.getNotesByNoteIds(PK,[SK],ProjectionExpression,ProjectionAttributeNames)

    return notes.reduce<NoteMediaItem[]>((acc, note) => {
      return [...acc, ...Object.values(note.medias || {})]
    }, [])
  }

  public async updateMediaStatus(
    PK: string,
    SK: string,
    key_status: Record<string, NoteMediaStatus>
  ): Promise<void> {
    const ExpressionAttributeNames: Record<string, string> = {
      '#status': 'status',
      '#medias': 'medias',
    };
    const AttributeValues: Record<string, any> = {};
    const updateExpressions: string[] = [];

    Object.entries(key_status).forEach(([key, status], index) => {
      // The expression now uses the new alias for "medias"
      updateExpressions.push(`#medias.#key${index}.#status = :status${index}`);
      ExpressionAttributeNames[`#key${index}`] = key;
      AttributeValues[`:status${index}`] = status;
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

    const data_map: Record<string,UpdateNoteDataInput> = inputs.reduce((acc,input)=> {
      acc[input.SK] = input
      return acc
    }, {} as Record<string,UpdateNoteDataInput>) 


    const promises = inputs.map(async (input) => {
      const permitedMediaCount: number = this.maxMediasPerItem 
                                + (input.remove_medias?.length || 0 ) - (input.add_medias?.length || 0 )
      const SetExpressions: string[] = []
      const RemoveExpressions: string[] = []
      const ConditionExpression = "size(#medias) <= :permitedMediaCount"
      const ExpressionAttributeValues: Record<string,any> = {
        ":permitedMediaCount": permitedMediaCount
      }
      const ExpressionAttributeNames: Record<string,string> = {
        "#medias": "medias"
      }
      
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
      input.add_medias?.forEach((media,index) => {
        const keyname = `#mediakey${index}`
        const valuename = `:mediaval${index}`
        SetExpressions.push(`#medias.${keyname} = ${valuename}`)
        ExpressionAttributeValues[valuename] = media
        ExpressionAttributeNames[keyname] = media.key
      })
      input.remove_medias?.forEach((key,index) => {
        const keyname = `#mediakey${index}`
        RemoveExpressions.push(`#medias.${keyname}`)
        ExpressionAttributeNames[keyname] = key
      })

      let UpdateExpression = ""
      if (SetExpressions.length > 0) {
        UpdateExpression += `SET ${SetExpressions.join(", ")}`
      }
      if (RemoveExpressions.length > 0) {
        UpdateExpression += ` REMOVE ${RemoveExpressions.join(", ")}`
      }

      try {
        const cmd = new UpdateItemCommand({
          TableName: TABLE_USER_NOTES,
          Key: marshall({PK,SK: input.SK}),
          UpdateExpression,
          ConditionExpression,
          ExpressionAttributeNames,
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
                  .filter(note => null !== note)

    return { items }
  }

  public async deleteMultipleNotes(PK: string, SKs: string[]): Promise<string[]> {
    // Build a lookup of SK → { global_id, keys }
    const notes: Record<string, { global_id: string; keys: string[] }> =
      (await this.getNotesByNoteIds(PK, SKs, "SK,global_id,medias"))
        .reduce((acc, { SK, global_id, medias }) => {
          if (!SK) return acc; // safeguard
          acc[SK] = {
            global_id: global_id!,
            keys: Object.keys(medias || {}),
          };
          return acc;
        }, {} as Record<string, { global_id: string; keys: string[] }>);

    // Delete each note
    const promises = SKs.map(async (SK) => {
      const note = notes[SK];
      if (!note) return [];

      const cmd = new TransactWriteItemsCommand({
        TransactItems: [
          {
            Delete: {
              TableName: TABLE_USER_NOTES,
              Key: marshall({ PK, SK }),
            },
          },
          {
            Update: {
              TableName: TABLE_USER_NOTES,
              Key: marshall({ PK,SK: SK_NGID_NID_MAP}),
              UpdateExpression: `REMOVE ${ATTRIBUTE_NGIDS_MAP}.#key`,
              ExpressionAttributeNames: {
                "#key": note.global_id
              } 
            },
          },
        ],
      });

      try {
        await this.client.send(cmd);
        return note.keys;
      } catch (error) {
        // optionally log error
        return [];
      }
    });

    const output = await Promise.all(promises);
    return output.flat(); // flatten keys into one string[]
}

  private async getNotesByNoteIds(
    PK: string,
    SKs: string[],
    ProjectionExpression?: string,
    ExpressionAttributeNames?: Record<string, string>
  ): Promise<Partial<NoteItem>[]> {
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
    return Responses?.[TABLE_USER_NOTES]?.map(response => unmarshall(response)) || []
  }
}
