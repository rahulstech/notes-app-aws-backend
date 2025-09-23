import { ENVIRONMENT } from "@notes-app/common";
import { NoteQueueService } from "../NoteQueueService";
import { NoteQueueServiceFactory } from "../NoteQueueServiceFactory";
import { NoteSQSQueueService } from "./NoteSQSQueueService";

const {
    NODE_ENV,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    SQS_REGION,
    SQS_URL,
  } = ENVIRONMENT;

export class NoteQueueServiceFactoryImpl implements NoteQueueServiceFactory {
    public createNoteQueueService(): NoteQueueService {
        return new NoteSQSQueueService({
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            region: SQS_REGION,
            queueUrl: SQS_URL,
          });
    }
}