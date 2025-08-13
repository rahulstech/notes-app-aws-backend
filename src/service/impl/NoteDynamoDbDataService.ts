import { DeleteItemCommand, DynamoDBClient, 
    GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import Note, { NoteMedia } from "../model/Note";
import NoteDataService from "../NoteDataService";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import NoteQueueService from "../NoteQueueService";
import QueueMessage, { QueueMessageEventType, QueueMessageSourceType } from "../model/QueueMessage";


const TABLE_USER_NOTES = "user_notes"

export interface DynamoDBClientOptions {
    
}

export default class NoteDynamoDbDataService implements NoteDataService {

    private queueService: NoteQueueService
    private client: DynamoDBClient

    constructor(queuService: NoteQueueService, options?: DynamoDBClientOptions) {
        this.queueService = queuService
        const client = new DynamoDBClient({
            endpoint: 'http://localhost:8000'
        })
        this.client = client
    }

    public async createNote(note: Note): Promise<Note> {
        note.note_id = Date.now().toString()
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
            const item = unmarshall(Attributes)
            const deletedNote = Note.fromDBItem(item)
            await this.enqueuDeleteNoteMediasMessage(deletedNote)
        }
    }

    private async enqueuDeleteNoteMediasMessage(deletedNote: Note): Promise<void> {
        const { medias } = deletedNote
        const keys: string[] = medias ? Object.keys(medias) : []
        if (keys.length == 0) {
            return
        }
        const message: QueueMessage = {
            source_type: QueueMessageSourceType.NOTE_SERVICE,
            event_type: QueueMessageEventType.DELETE_NOTE,
            body: { keys }
        }
        await this.queueService.enqueueMessage(message)
    }

    public async setNoteMedias(note_id: string, user_id: string, medias: NoteMedia[]): Promise<void> {
        const expression = medias.map((_,index) => `medias.#key${index} = :value${index}`).join(", ")
        const expressionnames = Object.fromEntries(medias.map(({key},index) => [`#key${index}`, key]))
        const expressionvalues = Object.fromEntries(medias.map((media,index) => [`:value${index}`, media]))
        const cmd = new UpdateItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({ user_id, note_id }),
            UpdateExpression: `SET ${expression}`,
            ExpressionAttributeValues: marshall(expressionvalues),
            ExpressionAttributeNames: expressionnames
        })

        await this.client.send(cmd)
    }
}