import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NoteS3ObjectService } from "@notes-app/storage-service";

// constants
const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET_NAME = process.env.S3_BUCKET || "";
const MEDIA_BASE_URL = "https://cnd.example.com/"

// helper functions 

async function putObject(client: S3Client, key: string, content: string) {
    await client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(content),
    }));
}

async function getAllKeys(client: S3Client, prefix?: string): Promise<string[]> {
    const {Contents} = await client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix
    }));
    if (Contents && Contents.length > 0) {
        return Contents.map(({Key})=>Key!);
    }
    return [];
}

async function clearAllObjects(client: S3Client) {
    const keys: string[] = await getAllKeys(client);
    if (keys.length > 0) {
        await client.send(new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: keys.map(Key=>({Key})),
            },
        }));
    }
}

// test code

describe("NoteS3ObjectService integration test", () => {

    let testClient: S3Client;
    let service: NoteS3ObjectService;

    beforeEach(()=>{
        testClient = new S3Client({
            endpoint: ENDPOINT,
            forcePathStyle: true, // NOTE: this is important for PutObjectCommand
        });
        service = new NoteS3ObjectService({
            client: testClient,
            bucket: BUCKET_NAME,
            mediaBaseUrl: MEDIA_BASE_URL,
        });
    })

    afterEach(async ()=>{
        await clearAllObjects(testClient);
        testClient.destroy();
    })

    test("isKeyExists existing key", async () => {
        const key = "test_content.txt";
        await putObject(testClient, key, "this is the content of the object");

        await expect(service.isKeyExists(key)).resolves.toBe(true);
    })

    test("isKeyExists non-existing key", async () => {
        const key = "non_existing.txt";

        await expect(service.isKeyExists(key)).resolves.toBe(false);
    })

    test("deleteMultipleObjects", async ()=>{
        const key = "test_content.txt"
        await putObject(testClient, key,"this is the test content");

        await expect(service.deleteMultipleObjects([key])).resolves.toStrictEqual([]);

        await expect(getAllKeys(testClient)).resolves.toStrictEqual([]);
    })

    test("deleteObjectByPrefix", async ()=>{
        const prefix = "files";
        await Promise.all(
            Array.from({length:3})
            .map((_,i)=>putObject(testClient, `${prefix}/test_content${i}.txt`,"this is the test content"))
        )
        
        await expect(service.deleteObjectByPrefix(prefix)).resolves.not.toThrow();

        await expect(getAllKeys(testClient,prefix)).resolves.toStrictEqual([]);
    })
})