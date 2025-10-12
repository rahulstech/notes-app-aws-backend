import { SQSClient } from "@aws-sdk/client-sqs";
import { NoteSQSQueueService, QueueMessageEventType, QueueMessageSourceType, RawQueueMessage } from "../../../src";

describe("NoteSQSQueueService unit tests", () => {

    let mockSend: jest.SpyInstance;
    let service: NoteSQSQueueService;

    beforeEach(() => {

        const client = new SQSClient({
            endpoint: "http://fakeendpoint:4566",
        });

        mockSend = jest.spyOn(client as any,"send");

        service = new NoteSQSQueueService({
            client,
            queueUrl: "https://fake.sqs-url",
        });
    })

    afterEach(() => {
        jest.clearAllMocks();
    })


    test("parseRawMessage known type", () => {
        const raw: RawQueueMessage = {
            ReceiptHandle: "fake-receipt-handle",
            Body: JSON.stringify({"Records":[
                    { 
                        "eventVersion":"2.1",
                        "eventSource":"aws:s3",
                        "awsRegion":"ap-south-1",
                        "eventTime":"2025-08-09T11:45:13.728Z",
                        "eventName":"ObjectCreated:Put",
                        "userIdentity":
                        {
                            "principalId":"AWS:AIDA4AQ3UC2J6IAIYD4X4"
                        },
                        "requestParameters":
                        {
                            "sourceIPAddress":"47.11.255.4"
                        },
                        "responseElements":
                        {
                            "x-amz-request-id": "JX6X7Q62B1P1KZ5P",
                            "x-amz-id-2": "qekowjeFDei0j2zZ1PO28HRSrsUzuaOVhfm2VGhWzIz1lA6fL6CAsCai1HdAv398Xm7kwWyUuMYcSIMOCMQail1khlf/I73s"
                        },
                        "s3":
                        {
                            "s3SchemaVersion":"1.0",
                            "configurationId":"event_object_created_media",
                            "bucket":
                            {
                                "name":"aws-lessons-nodejs",
                                "ownerIdentity":
                                {
                                    "principalId":"AFTKZR4G1HCZL"
                                },
                                "arn":"arn:aws:s3:::aws-lessons-nodejs"
                            },
                            "object":
                            {
                                "key":"medias/1754715070834/1754739857049",
                                "size":2054,
                                "eTag":"93dbdf055688a8806f15722011d7db59",
                                "sequencer":"00689734C9B3AB8813"
                            }
                        }
                    }]})
        };

        expect(service.parseRawMessage(raw)).toStrictEqual({
                source_type: QueueMessageSourceType.S3,
                event_type: QueueMessageEventType.CREATE_OBJECT,
                body: { 
                    bucket: "aws-lessons-nodejs",
                    key: "medias/1754715070834/1754739857049"
                 },
                receipt_handle: "fake-receipt-handle"
            }
        );
    })

    test("parseRawMessage unknown type", () => {
        const raw: RawQueueMessage = {
            ReceiptHandle: "fake-receipt-handle",
            Body: JSON.stringify({
                source_type: "AN_UNKNOWN_SOURCE",
                event_type: "AN_UNKNOWN_EVENT",
                body: { message: "this is a body" },
            })
        };

        expect(service.parseRawMessage(raw)).toStrictEqual({
                source_type: QueueMessageSourceType.UNKNOWN,
                event_type: QueueMessageEventType.UNKNOWN,
                body: { message: "this is a body" },
                receipt_handle: "fake-receipt-handle"
            }
        );
    })
})