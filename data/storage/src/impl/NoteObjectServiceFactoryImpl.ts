import { ENVIRONMENT } from "@notes-app/common";
import { NoteObjectService } from "../NoteObjectService";
import { NoteObjectServiceFactory } from "../NoteObjectServiceFactory";
import { NoteS3ObjectService } from "./NoteS3ObjectService";

const {
    NODE_ENV,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    S3_REGION,
    S3_BUCKET,
    MEDIA_CDN_URL_PREFIX,
  } = ENVIRONMENT;

export class NoteObjectServiceFactoryImpl implements NoteObjectServiceFactory {

    public createNoteObjectService(): NoteObjectService {
        return new NoteS3ObjectService({
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            region: S3_REGION,
            bucket: S3_BUCKET,
            mediaBaseUrl: MEDIA_CDN_URL_PREFIX,
          });
    }
}