import { BatchWriteItemCommand, DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DYNAMODB_ERROR_CODES, NoteDynamoDbDataService, NoteItem, NoteMediaItem, NoteMediaStatus, ShortNoteItem } from "@notes-app/database-service";
import { mockCreateNoteId } from "../../util/testhelpers";

const ENDPOINT = process.env.DYNAMODB_ENDPOINT;
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "user_notes";
const TEST_USER = "TEST-USER";
const MAX_MEDIAS_PER_NOTE = 5;

// helper functions

async function emptify(client: DynamoDBClient) {
    const { Items } = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :PK",
        ExpressionAttributeValues: marshall({
            ":PK": TEST_USER
        })
    }));

    if (Items && Items.length > 0) {
        await Promise.all(Items.map((item) => {
            return client.send(new DeleteItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ PK: TEST_USER, SK: item.SK.S! })
            }))
        }));
    }
}

async function getNoteById(client: DynamoDBClient, SK: string, PK: string = TEST_USER): Promise<NoteItem | undefined> {
    const { Item } = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ PK, SK })
    }));
    if (Item) {
        return unmarshall(Item) as NoteItem;
    }
    return undefined;
}

async function getNgids(client: DynamoDBClient, PK: string = TEST_USER): Promise<Record<string,string>> {
    const { Item } = await client.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ PK, SK: "_NGID_NID_MAP_"})
    }));
    if (Item) {
        return unmarshall(Item).ngids;
    }
    return {};
}

function createNoteItem(i: number, shortNote: boolean = false, replace?: Partial<NoteItem>): any {
    const note: any = {
        SK: replace?.SK ?? `NID-${i}`,// must match the returned value of NoteDynamoDbDataService#createNoteId()
        global_id: replace?.global_id ?? `note-${i}`,
        title: replace?.title ?? `note title ${i}`,
        short_content: replace?.short_content ?? `note content ${i}`,
        timestamp_created: replace?.timestamp_created ?? 15+i,
        timestamp_modified: replace?.timestamp_modified ?? 15+i,
    }

    if (!shortNote) {
        note.PK = replace?.PK ?? TEST_USER,
        note.medias = replace?.medias ?? {};
        note.content = replace?.content ?? `note content ${i}`;
        return note;
    }

    return note;
}

async function addFakeNotes(client: DynamoDBClient, length: number = 2 /* <= 25 */): Promise<void> {
    const notes: any[] = [];
    const ngids: Record<string,string> = {};

    Array.from({ length }).forEach((_,index) => {
        const note = createNoteItem(index+1);
        notes.push({
            PutRequest: {
                Item: marshall(note)
            }
        });
        ngids[note.global_id] = note.SK;
    })

    await client.send(new BatchWriteItemCommand({
        RequestItems: {
            [TABLE_NAME]: [
                ...notes,
                {
                    PutRequest: {
                        Item: marshall({
                            PK: TEST_USER,
                            SK: "_NGID_NID_MAP_",
                            ngids,
                        })
                    }
                }
            ]
        }
    }))
}

function createNoteMediaItem(i: number, replace: Partial<NoteMediaItem> = {}): NoteMediaItem {
    return {
        media_id: replace.media_id ?? `m${i}`,
        global_id: replace.global_id ?? `media-${i}`,
        key: replace.key ?? `media-key-${1}`,
        url: replace.url ?? `https://example.com/media-key-${i}`,
        type: replace.type ?? 'image/png',
        size: replace.size ?? 100,
        status: replace.status ?? NoteMediaStatus.NOT_AVAILABLE,
    };
}

// NOTE: media global ids are 1 based i.e. media-1, media-2 ...
async function addFakeNoteWithMedias(client: DynamoDBClient, mediaCount: number = 1 /* <= MAX_MEDIAS_PER_NOTE */): Promise<void> {
    const medias: Record<string,NoteMediaItem> = {};
    Array.from({ length: mediaCount }).forEach((_,i) => {
        const media = createNoteMediaItem(i+1);
        medias[media.media_id] = media;
    })
    await client.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
            PK: TEST_USER,
            SK: "NID-1", // must match the returned value of NoteDynamoDbDataService#createNoteId()
            global_id: "note-1",
            title: "note title 1",
            content: "note content 1",
            short_content: "note content 1",
            timestamp_created: 15,
            timestamp_modified: 15,
            medias
        })
    }));
}

// test suits

describe("NoteDynamodbDbDataService integration tests", () => {

    let testDBClient: DynamoDBClient;
    let service: NoteDynamoDbDataService;

    beforeEach(() => {
        testDBClient = new DynamoDBClient({
            endpoint: ENDPOINT,
        });;

        service = new NoteDynamoDbDataService({
            client: testDBClient,
            notesTableName: TABLE_NAME,
            maxMediasPerItem: MAX_MEDIAS_PER_NOTE,
        });
    })

    afterEach(async () => {
        try {
            await emptify(testDBClient);
            testDBClient.destroy();
        }
        finally {
            jest.clearAllMocks();
        }
    })

    // tests

    test("create a note, get the note by id and check the ngids map created", async () => {

        mockCreateNoteId(service!,["NID-1"]);

        await expect(service.createMultipleNotes(TEST_USER,[
            {
                global_id: "note-1",
                timestamp_created: 15,
                timestamp_modified: 15,
                title: "title of note 1",
                content: "this is a long content of the note 1. the content length is more than sixty characters",
                short_content: "this is a long content of the note 1. the content length is ",
            }
        ])).resolves.toEqual(expect.arrayContaining([expect.objectContaining({
            SK: "NID-1",
            global_id: "note-1",
            timestamp_created: 15,
            timestamp_modified: 15,
            title: "title of note 1",
            content: "this is a long content of the note 1. the content length is more than sixty characters",
            short_content: "this is a long content of the note 1. the content length is ",
        })]));

        await expect(getNoteById(testDBClient,"NID-1")).resolves.toStrictEqual({
                PK: "TEST-USER",
                SK: "NID-1",
                global_id: "note-1",
                timestamp_created: 15,
                timestamp_modified: 15,
                title: "title of note 1",
                content: "this is a long content of the note 1. the content length is more than sixty characters",
                short_content: "this is a long content of the note 1. the content length is ",
                medias: {}
            });

        await expect(getNgids(testDBClient)).resolves.toEqual(expect.objectContaining({
            "note-1": "NID-1"
        }));
    })

    test("get multiple notes", async () => {
        await addFakeNotes(testDBClient,5); // available 5 notes

        await expect(service.getNotes(
            TEST_USER,
            3 // asking 3 notes only, 2 more available; so pageMark must exists
        )).resolves
        .toEqual(expect.objectContaining({
            notes: [ // notes are arranged in descending order of timestamp_created therefore array is used not array containing
                createNoteItem(5,true),
                createNoteItem(4,true),
                createNoteItem(3,true)
            ],
            pageMark: expect.anything(), // not null or undefined
        }))
    })

    // addNoteMedia

    test("adding existing and non-existing media", async () => {
        await addFakeNoteWithMedias(testDBClient,1);

        await expect(service.addNoteMedias(TEST_USER,"NID-1", [
            createNoteMediaItem(1), // exising
            createNoteMediaItem(2) // non-exising
        ])).resolves.toEqual(expect.arrayContaining([
            createNoteMediaItem(2)
        ]))
    })

    test("adding medias more allowed", async () => {
        await addFakeNoteWithMedias(testDBClient,4);

        await expect(service.addNoteMedias(TEST_USER,"NID-1", [
            createNoteMediaItem(5),
            createNoteMediaItem(6)
        ])).rejects
        .toThrow(expect.objectContaining({
            name: "AppError",
            code: DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS
        }))
    })

    // removeNoteMedias

    test("remove exising and non-existing medias", async () => {
        await addFakeNoteWithMedias(testDBClient,1);

        await expect(service.removeNoteMedias(TEST_USER,"NID-1",["m1","m2"])).resolves.toEqual(["media-key-1"]);

        await expect(getNoteById(testDBClient,"NID-1")).resolves
        .toEqual(expect.objectContaining({
            medias: {}
        }))
    })
})