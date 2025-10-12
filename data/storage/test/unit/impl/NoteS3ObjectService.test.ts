import { S3Client } from "@aws-sdk/client-s3";
import { NoteS3ObjectService } from "@notes-app/storage-service"

const MEDIA_BASE_URL = "https://cdn.example.com";

describe("NoteS3ObjectService unit test", () => {

    let testClient: S3Client;
    let service: NoteS3ObjectService;

    beforeEach(()=>{
        testClient = new S3Client({
            endpoint: "http://fakeendpoint:4566",
        });
        service = new NoteS3ObjectService({
            client: testClient,
            bucket: "test-bucket",
            mediaBaseUrl: MEDIA_BASE_URL,
        });
    })

    afterEach(()=>{
        testClient.destroy();
    })

    test("getMediaUrl",()=>{
        const key = "files/file.ext";
        const url = `${MEDIA_BASE_URL}/${key}`;
        expect(service.getMediaUrl(key)).toStrictEqual(url);
    })

    test("getObjectKeyFromMediaUrl",()=>{
        const key = "files/file.ext";
        const url = `${MEDIA_BASE_URL}/${key}`;
        expect(service.getObjectKeyFromMediaUrl(url)).toStrictEqual(key);
    })
})