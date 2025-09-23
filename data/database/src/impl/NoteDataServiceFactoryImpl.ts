import { ENVIRONMENT, LOGGER } from "@notes-app/common";
import { NoteDataService } from "../NoteDataService";
import { NoteDataServiceFactory } from "../NoteDataServiceFactory";
import { NoteDynamoDbDataService } from "./NoteDynamoDbDataService";


const {
  NODE_ENV,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  DYNAMODB_REGION,
  DYNAMODB_NOTES_TABLE,
  DYNAMODB_LOCAL_ENDPOINT_URL,
  MAX_ALLOWED_MEDIAS_PER_NOTE,
} = ENVIRONMENT;
  

export class NoteDataServiceFactoryImpl implements NoteDataServiceFactory {

    public createNoteDataService(): NoteDataService {
        const baseConfig = {
            maxMediasPerItem: MAX_ALLOWED_MEDIAS_PER_NOTE,
            notesTableName: DYNAMODB_NOTES_TABLE,
          };
      
          if (NODE_ENV === "prod") {
            LOGGER.logInfo("Using PROD DynamoDB configuration");
            return new NoteDynamoDbDataService({
              ...baseConfig,
              region: DYNAMODB_REGION,
              accessKeyId: AWS_ACCESS_KEY_ID,
              secretAccessKey: AWS_SECRET_ACCESS_KEY,
            });
          }
      
          LOGGER.logInfo("Using DEV DynamoDB configuration");
          return new NoteDynamoDbDataService({
            ...baseConfig,
            localEndpointUrl: DYNAMODB_LOCAL_ENDPOINT_URL,
          });
    }
}