import { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  NoteDynamoDbDataService,
  DynamoDBClientOptions,
} from '@notes-app/database-service';
import {
  NoteS3ObjectService,
  S3ClientOptions,
} from '@notes-app/storage-service';
import {
  NoteSQSQueueService,
  SQSClientOptions,
} from '@notes-app/queue-service';
import {
  NoteRepository,
  NoteRepositoryImpl,
  NoteRespositoryOptions,
} from '@note-app/note-repository';

declare global {
  namespace Express {
    interface Request {
      noteRepository: NoteRepository;
    }
  }
}

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_REGION,
  S3_BUCKET,
  MEDIA_CDN_URL_PREFIX,
  SQS_REGION,
  SQS_URL,
  MAX_ALLOWED_MEDIAS_PER_NOTE
} = process.env;

export function installNoteRepository(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const queueOptions: SQSClientOptions = {
      region: SQS_REGION || '',
      accessKeyId: AWS_ACCESS_KEY_ID || '',
      secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
      queueUrl: SQS_URL || '',
    };
    const queueService = new NoteSQSQueueService(queueOptions);

    const storageOptions: S3ClientOptions = {
      region: S3_REGION || '',
      bucket: S3_BUCKET || '',
      accessKeyId: AWS_ACCESS_KEY_ID || '',
      secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
      mediaBaseUrl: MEDIA_CDN_URL_PREFIX || '',
    };
    const storageService = new NoteS3ObjectService(storageOptions);

    const dbOptions: DynamoDBClientOptions = {
      maxMediasPerItem: Number(MAX_ALLOWED_MEDIAS_PER_NOTE || 5)
    };
    const databaseService = new NoteDynamoDbDataService(dbOptions);

    const repositoryOptions: NoteRespositoryOptions = {
      databaseService,
      storageService,
      queueService,
    };
    req.noteRepository = new NoteRepositoryImpl(repositoryOptions);

    next();
  };
}
