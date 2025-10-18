import { configenv } from "@notes-app/common";
import { NoteQueueService } from "../NoteQueueService";
import { NoteQueueServiceFactory } from "../NoteQueueServiceFactory";
import { NoteSQSQueueService } from "./NoteSQSQueueService";
import { SQSClient } from "@aws-sdk/client-sqs";

const {
    AWS_ID,
    AWS_SECRET,
    SQS_REGION,
    SQS_URL
  } = configenv();

export class NoteQueueServiceFactoryImpl implements NoteQueueServiceFactory {
    public createNoteQueueService(): NoteQueueService {
        const client = new SQSClient({
        region: SQS_REGION,
        credentials: {
          accessKeyId: AWS_ID,
          secretAccessKey: AWS_SECRET,
        }
      })
      return new NoteSQSQueueService({
        queueUrl: SQS_URL,
        client,
      });
    }
}