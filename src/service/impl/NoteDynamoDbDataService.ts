import { DeleteItemCommand, DynamoDBClient, 
    GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import Note, { NoteMedia } from "../model/Note";
import NoteDataService from "../NoteDataService";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";


const TABLE_USER_NOTES = "user_notes"

export interface DynamoDBClientOptions {
    
}

export default class NoteDynamoDbDataService implements NoteDataService {

    private client: DynamoDBClient

    constructor(options?: DynamoDBClientOptions) {
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
        return new Promise<Note>((resolve,reject) => {
            const client = this.client
            client.send(cmd)
                .then(output => resolve(note))
                .catch(reject)
        })
    }

    public async getNotes(user_id: String): Promise<Note[]> {
        const cmd = new QueryCommand({
            TableName: TABLE_USER_NOTES,
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: marshall({
                ":user_id": "GUEST"
            })
        })
        return new Promise<Note[]>((resolve,reject)=>{
            const client = this.client
            client.send(cmd)
                .then(output => {
                    const notes: Note[] = output.Items?.map(Item => {
                        const item = unmarshall(Item)
                        return Note.fromDBItem(item)
                    }) ?? []
                    resolve(notes)
                })
                .catch(reject)
        })
    }

    public async getNoteById(note_id: string, user_id: string): Promise<Note | null> {
        const cmd = new GetItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({
                user_id, note_id
            })
        })
        return new Promise<Note|null>((resolve,reject)=>{
            const client = this.client
            client.send(cmd)
                .then(output => {
                    if (output.Item) {
                        const item = unmarshall(output.Item)
                        const note = Note.fromDBItem(item)
                        resolve(note)
                    }
                    else {
                        resolve(null)
                    }
                })
                .catch(reject)
        })
    }

    public async deleteNote(note_id: string, user_id: string): Promise<void> {
        const cmd = new DeleteItemCommand({
            TableName: TABLE_USER_NOTES,
            Key: marshall({
                user_id, note_id
            })
        })

        await this.client.send(cmd)
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