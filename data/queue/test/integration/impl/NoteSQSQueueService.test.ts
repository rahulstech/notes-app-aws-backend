import { Message, PurgeQueueCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { NoteSQSQueueService, QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "../../../src";

// constants

const ENDPOINT = process.env.SQS_ENDPOINT;
const SQS_URL = process.env.SQS_URL || "";

// helper function

async function sendMessage(client: SQSClient, content: any) {
    await client.send(new SendMessageCommand({
        QueueUrl: SQS_URL,
        MessageBody: JSON.stringify(content),
    }));
}

async function getMessage(client: SQSClient): Promise<Message | null> {
    const { Messages } = await client.send(new ReceiveMessageCommand({
        QueueUrl: SQS_URL,
        WaitTimeSeconds: 0,
        MaxNumberOfMessages: 1,
    }));
    if (Messages && Messages.length > 0) {
        return Messages[0];
    }
    return null;
}

async function clearMessages(client: SQSClient): Promise<void> {
    await client.send(new PurgeQueueCommand({
        QueueUrl: SQS_URL
    }))
}

// test code

describe("NoteSQSQueueService integration test", () => {

    let testClient: SQSClient;
    let service: NoteSQSQueueService;

    beforeEach(()=>{
        testClient = new SQSClient({
            endpoint: ENDPOINT,
        });
        service = new NoteSQSQueueService({
            client: testClient,
            queueUrl: SQS_URL
        });
    })

    afterEach(async ()=>{
        await clearMessages(testClient);
        testClient.destroy();
    })

    test("enqueueMessage", async () => {
        const message = {
            source_type: QueueMessageSourceType.NOTE_SERVICE,
            event_type: QueueMessageEventType.DELETE_MEDIAS,
            body: {
                medias: ["key1","key2","key3"]
            }
        };

        await expect(service.enqueueMessage(message)).resolves.not.toThrow();

        await expect(getMessage(testClient)).resolves
        .toEqual(expect.objectContaining({
            Body: JSON.stringify(message)
        }));
    })

    test("peekMessages", async () => {

        const message = {
            source_type: QueueMessageSourceType.NOTE_SERVICE,
            event_type: QueueMessageEventType.DELETE_MEDIAS,
            body: {
                medias: ["key1","key2","key3"]
            }
        };

        await sendMessage(testClient, message);

        await expect(service.peekMultipleMessages()).resolves
        .toEqual(expect.arrayContaining([
            expect.objectContaining(message)
        ]));
    })

    test("removeMessage", async () => {
        const message: QueueMessage = {
            source_type: QueueMessageSourceType.NOTE_SERVICE,
            event_type: QueueMessageEventType.DELETE_MEDIAS,
            body: {
                medias: ["key1","key2","key3"]
            },
        };

        await sendMessage(testClient, message);
        
        // I need the ReceiptHandle from the received message, without it message can not be deleted
        const { ReceiptHandle } = (await getMessage(testClient)) as Message;

        // set the receipt_handle to the message
        message.receipt_handle = ReceiptHandle;

        await expect(service.removeMultipleMessages([message])).resolves
        .not.toThrow();

        await expect(getMessage(testClient)).resolves.toBeNull();
    })
})