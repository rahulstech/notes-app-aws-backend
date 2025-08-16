import { DeleteItemCommand, DynamoDBClient, 
    GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import Note, { CreateNoteInput, NoteMedia, NoteMediaInput, UpdateNoteInput } from "../model/Note";
import NoteDataService from "../NoteDataService";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "node:crypto";
import NoteObjectService from "../NoteObjectService";


const TABLE_USER_NOTES = "user_notes"
const MAX_ALLOWED_MEDIAS_PER_NOTE = process.env.MAX_ALLOWED_MEDIAS_PER_NOTE ? Number(process.env.MAX_ALLOWED_MEDIAS_PER_NOTE) : 0


export interface DynamoDBClientOptions {
    objectService: NoteObjectService,
}

export default class NoteDynamoDbDataService implements NoteDataService {

    private objectService: NoteObjectService
    private client: DynamoDBClient

    constructor(options: DynamoDBClientOptions) {
        this.objectService = options.objectService
        const client = new DynamoDBClient({
            endpoint: 'http://localhost:8000'
        })
        this.client = client
    }

    public async createNote(input: CreateNoteInput): Promise<Note> {
        const { user_id, global_id, title, content, medias } = input
        const note_id = randomUUID()
        const note = new Note(global_id, title, content, user_id)
        note.note_id = note_id
        if (medias && medias.length > 0) {
            const note_medias: Record<string,NoteMedia> = Object.fromEntries(medias.map( media => {
                const note_media: NoteMedia = this.createNoteMedia(note.user_id, note_id, media)
                return [note_media.key,note_media]
            }))
            note.medias = note_medias
        }
        const noteItem = note.toDBItem()
        const Item = marshall({...noteItem })
        const cmd = new PutItemCommand({
            TableName: TABLE_USER_NOTES,
            Item
        })

        await this.client.send(cmd)

        return note
    }

    public async getNotes(user_id: String): Promise<Note[]> {
        const cmd = new QueryCommand({
            TableName: TABLE_USER_NOTES,
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: marshall({
                ":user_id": user_id
            })
        })
        const output = await this.client.send(cmd)
        const notes: Note[] = output.Items?.map(Item => {
            const item = unmarshall(Item)
            return Note.fromDBItem(item)
        }) ?? []
        return notes
    }

    public async getNoteById(note_id: string, user_id: string): Promise<Note | null> {
        const cmd = new GetItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({
                user_id, note_id
            })
        })

        const output = await this.client.send(cmd)
        if (output.Item) {
            const item = unmarshall(output.Item)
            const note = Note.fromDBItem(item)
            return note
        }
        return null
    }

    public async deleteNote(note_id: string, user_id: string): Promise<void> {
        const cmd = new DeleteItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({
                user_id, note_id
            }),
            ReturnValues: 'ALL_OLD'
        })

        const { Attributes } = await this.client.send(cmd)
        if (Attributes) {
            const deletedNote = Note.fromDBItem(unmarshall(Attributes))
            const keys = deletedNote.medias ? Object.keys(deletedNote.medias) : []
            await this.objectService.deleteMultipleMedias(keys)
        }
    }

    public async updateNote(input: UpdateNoteInput): Promise<Note> {
        const { user_id, note_id, title, content, add_medias, remove_medias } = input
        const removecount = remove_medias?.length || 0
        const addcount = add_medias?.length || 0  

        const SetExpressions: string[] = []
        const RemoveExpressions: string[] = []
        const AttributeNames: Record<string,string> = {}
        const AttributeValues: Record<string,any> = {}
        if (title) {
            SetExpressions.push("title = :title")
            AttributeValues[":title"] = title
        }
        if (content) {
            SetExpressions.push("content = :content")
            AttributeValues[":content"] = content
        }
        if (addcount > 0) {
            add_medias?.forEach( (media_intput,index) => {
                const note_media: NoteMedia = this.createNoteMedia(user_id, note_id, media_intput)
                const keyname = `#addkey${index}`
                const valuename = `:media${index}`
                SetExpressions.push(`medias.${keyname} = ${valuename}`)
                AttributeNames[keyname] = note_media.key
                AttributeValues[valuename] = note_media
            })
        }
        if (removecount > 0) {
            remove_medias?.forEach((media_key, index) => {
                const keyname = `#removekey${index}`
                RemoveExpressions.push(`medias.${keyname}`)
                AttributeNames[keyname] = media_key
            })
        }

        let UpdateExpression = ""
        if (SetExpressions.length > 0) {
            UpdateExpression += `SET ${SetExpressions.join(",")}`
        }
        if (RemoveExpressions.length > 0) {
            UpdateExpression += ` REMOVE ${RemoveExpressions.join(",")}`
        }

        const cmd = new UpdateItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({ user_id, note_id }),
            UpdateExpression,
            ConditionExpression: "size(medias) <= :permitcount",
            ExpressionAttributeNames: AttributeNames,
            ExpressionAttributeValues: marshall({
                ...AttributeValues,
                ":permitcount": MAX_ALLOWED_MEDIAS_PER_NOTE + removecount - addcount,
            }),
            ReturnValues: 'ALL_NEW'
        })

        const { Attributes } = await this.client.send(cmd)

        if (removecount > 0) {
            await this.objectService.deleteMultipleMedias(remove_medias!)
        }

        return Note.fromDBItem(unmarshall(Attributes!))
    }

    private createNoteMedia(user_id: string, note_id: string, input: NoteMediaInput): NoteMedia {
        const key = this.objectService.createMediaObjectKey(user_id, note_id)
        const url = this.objectService.getMediaUrl(key)
        const note_media: NoteMedia = { ...input, url, key }
        return note_media
    }
}