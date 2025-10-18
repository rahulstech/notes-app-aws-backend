import { NoteDataService } from "../NoteDataService";
import { NoteDataServiceFactory } from "../NoteDataServiceFactory";
import { NoteDynamoDbDataService } from "./NoteDynamoDbDataService";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const {
  NODE_ENV,
  AWS_ID,
  AWS_SECRET,
  DYNAMODB_REGION,
  DYNAMODB_NOTES_TABLE,
  DYNAMODB_LOCAL_ENDPOINT_URL,
  MAX_ALLOWED_MEDIAS_PER_NOTE,
} = process.env as Record<string,any>;
  

export class NoteDataServiceFactoryImpl implements NoteDataServiceFactory {

    public createNoteDataService(): NoteDataService {
      if (NODE_ENV === "prod") { 
        return this.createProdDataServicce();
      }
      return this.createDevNoteDataService();
    }

    private createDevNoteDataService(): NoteDataService {
      const client = new DynamoDBClient({
        endpoint: DYNAMODB_LOCAL_ENDPOINT_URL
      });

      return new NoteDynamoDbDataService({
        notesTableName: DYNAMODB_NOTES_TABLE,
        maxMediasPerItem: MAX_ALLOWED_MEDIAS_PER_NOTE,
        client,
      });
    }

    private createProdDataServicce(): NoteDataService {
      const client = new DynamoDBClient({
        region: DYNAMODB_REGION,
        credentials: {
          accessKeyId: AWS_ID,
          secretAccessKey: AWS_SECRET,
        }
      });

      return new NoteDynamoDbDataService({
        notesTableName: DYNAMODB_NOTES_TABLE,
        maxMediasPerItem: MAX_ALLOWED_MEDIAS_PER_NOTE,
        client,
      });
    }
}