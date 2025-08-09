import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import Note from "../model/Note";
import NoteDataService from "../NoteDataService";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export default class NoteDynamoDbDataService implements NoteDataService {
    private client: DynamoDBClient

    constructor() {
        const client = new DynamoDBClient({
            endpoint: 'http://localhost:8000'
        })
        this.client = client
    }

    public async createNote(note: Note): Promise<Note> {
        note.note_id = Date.now().toString()
        const item = marshall({...note })
        const cmd = new PutItemCommand({
            TableName: 'user_notes',
            Item: item
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
            TableName: 'user_notes',
            KeyConditionExpression: "user_id = :user_id",
            ExpressionAttributeValues: {
                ":user_id": {"S": "GUEST"}
            }
        })
        return new Promise<Note[]>((resolve,reject)=>{
            const client = this.client
            client.send(cmd)
                .then(output => {
                    const notes: Note[] = output.Items?.map(item => {
                        const data = unmarshall(item)
                        return new Note(data.global_id, data.title, data.content, data.user_id, data.note_id)
                    }) ?? []
                    resolve(notes)
                })
                .catch(reject)
        })
    }

    public async getNoteById(note_id: string, user_id: string): Promise<Note | null> {
        const cmd = new GetItemCommand({
            TableName: 'user_notes',
            Key: marshall({
                user_id, note_id
            })
        })
        return new Promise<Note|null>((resolve,reject)=>{
            const client = this.client
            client.send(cmd)
                .then(output => {
                    if (output.Item) {
                        const data = unmarshall(output.Item)
                        const note = new Note(data.global_id, data.title, data.console, data.user_id, data.note_id)
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
            TableName: 'user_notes',
            Key: marshall({
                user_id, note_id
            })
        })
        return new Promise<void>((resolve,reject) => {
            const client = this.client
            client.send(cmd)
                .then(output => resolve())
                .catch(reject)
        })
    }
}