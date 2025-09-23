import {
  NoteQueueService,
  QueueMessage,
  QueueMessageEventType,
  QueueMessageSourceType,
} from '@notes-app/queue-service';
import { NoteRepository } from '../NoteRepository';
import {
  CreateNotesInput,
  CreateNotesOutput,
  GetNoteInput,
  GetNotesInput,
  GetNotesOutput,
  UpdateNotesInput,
  UpdateNotesOutput,
  DeleteNotesInput,
  AddMediasInput,
  AddMediasOutput,
  RemoveMediasInput,
  RemoveMediasOutput,
  UpdateMediaStatusInput,
  DeleteNotesOutput,
  UpdateMediaStatusOutput,
  AddMediaItemOutput,
  DeleteMediasByKeyInput,
  DeleteMediasByKeyOutput,
  DeleteMediasByPrefixInput,
  DeleteMediasByPrefixOutput,
  GetMediaUploadUrlInput,
  GetMediaUploadUrlOutput,
  GetNoteOutput,
  GetMediaUploadUrlItemOutput,
  UpdateNoteItemOutput,
  CreateNoteItemOutput,
} from '../types';
import {
  CreateNoteDataInputItem,
  DYNAMODB_ERROR_CODES,
  NoteDataService,
  NoteItem,
  NoteMediaItem,
  NoteMediaStatus,
} from '@notes-app/database-service';
import { NoteObjectService } from '@notes-app/storage-service';
import { createNoteMediaKey, createNoteShortContent, noteItemToNoteItemOutput, shortNoteItemToNoteItemOutputList } from '../helpers';
import { AppError, encodeBase64, executeBatch, LOGGER, newAppErrorBuilder, pickExcept, renameKeys  } from '@notes-app/common';
import { convertNoteRepositoryError, convertToErrorItemOutput, NOTE_REPOSITORY_ERROR_CODES } from '../errors';

const NOTE_MEDIAS_UPLOAD_URL_EXPIRES_IN_SECONDS = 3600; // 1 hour
const LOG_TAG = 'NoteRepositoryImpl';

export interface NoteRespositoryOptions {
  databaseService: NoteDataService;
  storageService: NoteObjectService;
  queueService: NoteQueueService;
}

export class NoteRepositoryImpl implements NoteRepository {
  private db: NoteDataService;
  private queue: NoteQueueService;
  private storage: NoteObjectService;

  constructor(options: NoteRespositoryOptions) {
    this.db = options.databaseService;
    this.storage = options.storageService;
    this.queue = options.queueService;
  }

  // create notes 

  public async createNotes(input: CreateNotesInput): Promise<CreateNotesOutput> {
    const { PK, inputs } = input;

    // create NoteItems from inputs
    const inputItems: CreateNoteDataInputItem[] = inputs.map((input) => ({
      PK,
      ...input,
      short_content: createNoteShortContent(input.content),
    }));

    try {
      // create note items
      const outputs = await this.db.createMultipleNotes(PK, inputItems);
      if (outputs.length > 0) {
        return { 
          notes: outputs.map(item => {
            const error = item.error;
            const output = noteItemToNoteItemOutput(item as NoteItem);
            if (error) {
              return {
                ...output,
                error: convertToErrorItemOutput(error),
              }
            }
            return output as CreateNoteItemOutput;
          }) 
        }
      }
    }
    catch(error) {
      throw convertNoteRepositoryError('createNotes',error);
    }

    // no items created due to db data service error
    throw newAppErrorBuilder()
          .setHttpCode(500)
          .setCode(NOTE_REPOSITORY_ERROR_CODES.CREATE_NOTES_FAILED)
          .build();
  }

  // get note

  public async getNote(input: GetNoteInput): Promise<GetNoteOutput> {
    const { PK, SK } = input;
    try {
      const item = await this.db.getNoteById(PK,SK);
      return {
        note: noteItemToNoteItemOutput(item),
      }
    }
    catch(error) {
      throw convertNoteRepositoryError('getNote',error);
    }
  }

  // get notes
  
  public async getNotes(input: GetNotesInput): Promise<GetNotesOutput> {
    const { PK, limit, pageMark } = input;
    try {
      const output = await this.db.getNotes(PK,limit,pageMark);
      const notes = shortNoteItemToNoteItemOutputList(output.notes);
      return {
        limit: output.limit,
        count: notes.length,
        pageMark: output.pageMark,
        notes,
      };
    }
    catch(error) {
      throw convertNoteRepositoryError("getNotes", error);
    }
  }

  // update notes

  public async updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput> {
    const { PK, inputs } = input;
    try {
      // update db items
      const outputs: UpdateNoteItemOutput[] = await executeBatch(
        inputs,
        async (input) => {
          if (input.content && !input.short_content) {
            input.short_content = createNoteShortContent(input.content);
          }
          try {
            const updateOutput = await this.db.updateSingleNote(PK,input);
            return renameKeys(updateOutput,{'SK':'note_id'});
          }
          catch(error) {
            return {
              ...renameKeys(input,{'SK':'note_id'}),
              error: convertToErrorItemOutput(error as AppError),
            }
          }
        },
        25,
        100
      );
      return { outputs };
    }
    catch(error) {
      throw convertNoteRepositoryError('updateNotes',error);
    }
  }

  // delete notes

  public async deleteNotes(input: DeleteNotesInput): Promise<DeleteNotesOutput> {
    const { PK, SKs } = input
    if (SKs.length == 0) {
      return {};
    }

    try {
      const { unsuccessful } = await this.db.deleteMultipleNotes(PK,SKs);
      const unsuccessfulSet = new Set(unsuccessful ?? []);
      const prefix = SKs
        .filter(SK => !unsuccessfulSet.has(SK))
        .map(SK => createNoteMediaKey({ user_id: PK, note_id: SK }));

      this.enqueuDeleteNotesMessage(prefix);

      return { unsuccessful };
    }
    catch(error) {
      throw convertNoteRepositoryError('deleteNotes', error);
    }
  }

  private async enqueuDeleteNotesMessage(prefixes: string[]): Promise<void> {
    if (prefixes.length == 0) return;

    const message: QueueMessage = {
      source_type: QueueMessageSourceType.NOTE_SERVICE,
      event_type: QueueMessageEventType.DELETE_NOTES,
      body: { prefixes },
    };

    await this.queue.enqueueMessage(message);
  }

  /* NoteMedia related method */

  // add media

  public async addMedias(input: AddMediasInput): Promise<AddMediasOutput> {
    const { PK, inputs } = input;

    // save new note medias in db
    try {
      const outputs = await executeBatch(
        inputs,
        async ({SK,medias}) => {
          try {
            const mediaInputs = medias.map(media => this.convertToNoteMediaItem(PK,SK,media));
            const mediaItems = await this.db.addNoteMedias(PK,SK,mediaInputs);
            return { 
              note_id: SK, 
              medias: mediaItems.map(media => pickExcept(media,['status'])) 
            };
          }
          catch(error) {
            return {
              note_id: SK,
              error:  convertToErrorItemOutput(error as AppError)
            };
          }
        },
        12,
        100
      );
      return { outputs: outputs as AddMediaItemOutput[] };
    }
    catch(error) {
      throw convertNoteRepositoryError('addMedias',error);
    }
  }

  private convertToNoteMediaItem(PK: string, SK: string, input: Pick<NoteMediaItem,'global_id'|'type'|'size'>): NoteMediaItem {
    const { global_id, type, size } = input;
    const key = createNoteMediaKey({ user_id: PK, note_id: SK, media_id: global_id });
    return {
      media_id: encodeBase64(global_id),
      global_id,
      key,
      url: this.storage.getMediaUrl(key),
      type,
      size,
      status: NoteMediaStatus.NOT_AVAILABLE,
    };
  }

  // get media

  public async getMediaUploadUrl(input: GetMediaUploadUrlInput): Promise<GetMediaUploadUrlOutput> {
    const { PK, inputs } = input;
    try {
      const outputs = await executeBatch(inputs,async ({SK,media_ids}) => {
        try {
          return await this.generateMediaUploadUrls(PK,SK,media_ids);
        }
        catch(error) {
          return {
            note_id: SK,
            media_ids,
            error: convertToErrorItemOutput(error as AppError)
          }
        }
      },
      4,
      100);
      return { outputs };
    }
    catch(error) {
      throw convertNoteRepositoryError('getMediaUploadUrls',error);
    }
  }

  private async generateMediaUploadUrls(PK: string, SK: string, media_ids: string[]): Promise<GetMediaUploadUrlItemOutput> {
    const medias: Record<string,NoteMediaItem> = await this.db.getNoteMedias(PK,SK);
    const filterd = media_ids
                    .filter(media_id => medias[media_id] && medias[media_id].status === NoteMediaStatus.NOT_AVAILABLE)
                    .map(media_id => medias[media_id]);
    if (filterd.length === 0) {
      throw newAppErrorBuilder()
            .setHttpCode(404)
            .setCode(DYNAMODB_ERROR_CODES.MEDIA_ITEM_NOT_FOUND)
            .addDetails('no media found by the given media ids')
            .setRetriable(false)
            .build()
    }
    const urls = await Promise.all(filterd.map(async ({media_id,key,type,size}) => { 
      try {
        const output = await this.storage.getObjectUploadUrl({
          key,
          mime_type: type,
          size,
          expires_in: NOTE_MEDIAS_UPLOAD_URL_EXPIRES_IN_SECONDS
        });
        return {
          media_id,
          ...output,
        }
      }
      catch(error) {
        return { 
          media_id 
        }
      }
    }));
    return { note_id: SK, urls };
  }

  // update media

  public async updateMediaStatus(input: UpdateMediaStatusInput): Promise<UpdateMediaStatusOutput> {
    const { PK, inputs } = input;
    try {
      const items = (await executeBatch(
          Object.entries(inputs),
          async ([SK,status]) => {
            try {
              await this.db.updateMediaStatus(PK,SK,status);
              return status;
            }
            catch(error) {
              const dberror = error as AppError;
              if (!dberror.retriable) {
                return status;
              }
            }
            return [];
          },
          25,
          100
        )
      ).flat();
      return { items };
    }
    catch(error) {
      throw convertNoteRepositoryError('updateMediaStatus',error);
    }
  }

  // delete media

  public async removeMedias(input: RemoveMediasInput): Promise<RemoveMediasOutput> {
    const { PK, inputs } = input;
    try {
      const outputs = await executeBatch(
        inputs, 
        async ({SK,media_ids})=>{
          try {
            const keys = await this.db.removeNoteMedias(PK,SK,media_ids)
            return { keys }
          }
          catch(error) {
            LOGGER.logInfo(error, `${LOG_TAG}#removeMedias`);
            const dberror = error as AppError;
            // TODO: add error to return
            if (dberror.retriable) {
              return { 
                SK,
                media_ids,
              }
            }
          }
          return { keys: [] };
        },
        25,
        100
      );

      const allKeys: string[] = [];
      const allUnsuccessful: { SK: string, media_ids: string[] }[] = [];
      outputs.forEach(({SK,keys,media_ids})=>{
        if (keys) {
          allKeys.push(...keys);
        }
        else {
          allUnsuccessful.push({ SK, media_ids });
        }
      });

      // enqueue a message to delete the media objects
      await this.enqueuDeleteMediasMessage(allKeys);

      return {
        unsuccessful: allUnsuccessful.length > 0 ? allUnsuccessful : undefined,
      }
    }
    catch(error) {
      throw convertNoteRepositoryError('removeMedias',error);
    }
  }

  public async deleteMediasByKey(input: DeleteMediasByKeyInput): Promise<DeleteMediasByKeyOutput> {
    const { keys } = input;
    try {
      const unsuccessful = await this.storage.deleteMultipleObjects(keys);
      return { unsuccessful };
    }
    catch(error) {
      throw convertNoteRepositoryError('deleteMediasByKey',error);
    }
  }

  public async deleteMediasByPrefixes(input: DeleteMediasByPrefixInput): Promise<DeleteMediasByPrefixOutput> {
    const { prefixes, extras } = input;
    const outputs = await executeBatch(prefixes,
      async (prefix) => {
        try {
          await this.storage.deleteObjectByPrefix(prefix);
          return null;
        }
        catch(error) {
          const err = error as AppError;
          if (!err.operational) {
            throw err;
          }
          else {
            LOGGER.logInfo(error,{ tag: `${LOG_TAG}#deleteMediasByPrefies`, prefix });
          }
        }
        return prefix;
    }, 
    25, 
    100);
    // return (await Promise.all(
    //   prefixes.map(async (prefix) => {
        
    //   }))
    // ).filter(v => v !== null)
    return { 
      unsuccessful: outputs.filter(item => null !== item),
      extras
    }
  }

  private async enqueuDeleteMediasMessage(keys: string[]): Promise<void> {
    if (keys.length == 0) return;

    const message: QueueMessage = {
      source_type: QueueMessageSourceType.NOTE_SERVICE,
      event_type: QueueMessageEventType.DELETE_MEDIAS,
      body: { keys },
    };

    await this.queue.enqueueMessage(message);
  }
}
