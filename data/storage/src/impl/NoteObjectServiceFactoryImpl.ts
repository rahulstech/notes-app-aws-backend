import { configenv } from "@notes-app/common";
import { NoteObjectService } from "../NoteObjectService";
import { NoteObjectServiceFactory } from "../NoteObjectServiceFactory";
import { NoteS3ObjectService } from "./NoteS3ObjectService";
import { S3Client } from "@aws-sdk/client-s3";

const {
    NODE_ENV,
    AWS_ID,
    AWS_SECRET,
    S3_REGION,
    S3_BUCKET,
    S3_LOCAL_ENDPOINT_URL,
    MEDIA_CDN_URL_PREFIX,
  } = configenv();

export class NoteObjectServiceFactoryImpl implements NoteObjectServiceFactory {

    public createNoteObjectService(): NoteObjectService {
        if (NODE_ENV === "prod") {
          return this.createProdNoteObjectService();
        }
        return this.createDevNoteObjectService();
    }

    private createDevNoteObjectService(): NoteObjectService {
      const client = new S3Client({
        endpoint: S3_LOCAL_ENDPOINT_URL,
      });

      return new NoteS3ObjectService({
            bucket: S3_BUCKET,
            mediaBaseUrl: MEDIA_CDN_URL_PREFIX,
            client,
          });
    }

    private createProdNoteObjectService(): NoteObjectService {
      const client = new S3Client({
        region: S3_REGION,
        credentials: {
          accessKeyId: AWS_ID,
          secretAccessKey: AWS_SECRET
        }
      });

      return new NoteS3ObjectService({
            bucket: S3_BUCKET,
            mediaBaseUrl: MEDIA_CDN_URL_PREFIX,
            client,
          });
    }
}