import { configenv } from "@notes-app/common";
import { NoteQueueService } from "../NoteQueueService";
import { NoteQueueServiceFactory } from "../NoteQueueServiceFactory";
import { NoteSQSQueueService } from "./NoteSQSQueueService";
import { SQSClient } from "@aws-sdk/client-sqs";

const {
    NODE_ENV,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    SQS_REGION,
    SQS_URL,
    SQS_LOCAL_ENDPOINT_URL,
  } = configenv();

export class NoteQueueServiceFactoryImpl implements NoteQueueServiceFactory {
    public createNoteQueueService(): NoteQueueService {
        if (NODE_ENV === "prod") {
          return this.createProdNoteQueueService();
        }
        return this.createDevNoteQueueService();
    }

    public createDevNoteQueueService(): NoteQueueService {
      const client = new SQSClient({
        endpoint: SQS_LOCAL_ENDPOINT_URL,
      })
      return new NoteSQSQueueService({
        queueUrl: SQS_URL,
        client,
      });
    }

    public createProdNoteQueueService(): NoteQueueService {
      const client = new SQSClient({
        region: SQS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        }
      })
      return new NoteSQSQueueService({
        queueUrl: SQS_URL,
        client,
      });
    }
}