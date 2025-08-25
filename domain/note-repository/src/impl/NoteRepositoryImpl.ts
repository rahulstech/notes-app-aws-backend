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
  GetNoteOutput,
  GetNotesInput,
  GetNotesOutput,
  UpdateNotesInput,
  UpdateNotesOutput,
  DeleteNotesInput,
  CreateNoteItemInput,
  NoteMediaUploadUrlsInput,
  NoteMediaUplodUrlsOutput,
} from '../types';
import {
  NoteDataService,
  NoteItem,
  NoteMediaItem,
  NoteMediaStatus,
  ShortNoteItem,
  UpdateNoteDataInput,
} from '@notes-app/database-service';
import { NoteObjectService } from '@notes-app/storage-service';
import { noteItemToNoteItemOutput, noteItemToNoteItemOutputList, shortNoteItemToNoteItemOutputList } from '../utils';
import { AppError, renameKeys } from '@notes-app/common';

const NOTE_MEDIAS_UPLOAD_URL_EXPIRES_IN_SECONDS = 3600 // 1 hour

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

  public async createNotes(inputs: CreateNotesInput): Promise<CreateNotesOutput> {
    const { user_id: PK, notes } = inputs;

    // prepare note items to create which does not exists
    const noteItems = this.convertCreateNoteItemInputs(PK,notes)

    // create note items
    const { items, error } = await this.db.createMultipleNotes(PK, noteItems);

    const output: CreateNotesOutput = { error }
    if (items) {
      output.notes = noteItemToNoteItemOutputList(items)
    }

    return output
  }

  private convertCreateNoteItemInputs(PK: string, input: CreateNoteItemInput[]): NoteItem[] {
    return input.map(
      ({
        global_id,
        title,
        content,
        timestamp_created,
        timestamp_modified,
        add_medias,
      }) => {
        const SK = this.db.createNoteId();
        const short_content = NoteItem.createShortContent(content)
        const medias: Record<string, NoteMediaItem> = (add_medias ?? []).reduce(
          (acc, data) => {
            const item = this.createNoteMediaItem(PK,SK,data)
            acc[item.key] = item
            return acc;
          },
          {} as Record<string, NoteMediaItem>
        );

        return new NoteItem(
          PK,
          SK,
          global_id,
          title,
          content,
          short_content,
          timestamp_created,
          timestamp_modified,
          medias
        );
      }
    )
  }

  public async getNote(input: GetNoteInput): Promise<GetNoteOutput> {
    const item: NoteItem | null = await this.db.getNoteById(
      input.user_id,
      input.note_id,
    );
    return {
      note: item == null ? null : noteItemToNoteItemOutput(item)
    };
  }

  public async getNotes(input: GetNotesInput): Promise<GetNotesOutput> {
    const items: ShortNoteItem[] = await this.db.getNotes(input.user_id);
    return {
      notes: shortNoteItemToNoteItemOutputList(items),
    };
  }

  public async getMediaUploadUrls(input: NoteMediaUploadUrlsInput): Promise<NoteMediaUplodUrlsOutput> {
    const { user_id: PK, media_keys } = input

    const outputs = (await Promise.all(Object.keys(media_keys).map(async (SK) => {
        const keys = media_keys[SK]
        if (keys.length === 0) return []

        try {
          const medias: NoteMediaItem[] = (await this.db.getNoteMediasByKeys(PK,SK,keys))
                                        .filter(item => item.status === NoteMediaStatus.NOT_AVAILABLE)

          return await Promise.all(medias.map(async ({key,type,size}) => {
            try {
              const output = await this.storage.getObjectUploadUrl({
                key,mime_type:type,size,expires_in: NOTE_MEDIAS_UPLOAD_URL_EXPIRES_IN_SECONDS
              })
              return { upload_url_item: { SK, key, ...output } }
            }
            catch(error) {
              return { error }
            }
          }))
        }
        catch(error) {
          return [{ error }]
        }
      })
    ))

    const output: NoteMediaUplodUrlsOutput = {}

    outputs.forEach(items => {
      items.forEach( ({upload_url_item, error}) => {
        if (upload_url_item) {
          if (!output.urls) {
            output.urls = []
          }
          output.urls.push(upload_url_item)
        }
        if (error) {
          if (!output.error) {
            output.error = new AppError(500)
          }
          output.error.appendDetails({description: "" }) // TODO: add error for media upload url 
        }
      })
    })

    return output
  }

  public async updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput> {
    const { user_id: PK, notes } = input

    let remove_media_keys: string[] = []

    const updateInputs = notes.map(note => {
      const data = renameKeys(note,{ "note_id": "SK"});
      const { SK, remove_medias,add_medias } = data; 
      if (remove_medias) {
        remove_media_keys = [...remove_media_keys, ...remove_medias]
      }
      return {
        ...data,
        add_medias: add_medias?.map((item:Record<string,any>) => this.createNoteMediaItem(PK,SK,item)),
      } as UpdateNoteDataInput
    })

    // update db items
    const { items, fail, error } = await this.db.updateMultipleNotes(PK,updateInputs)

    // enqeue events to delete media
    await this.enqueuDeleteMediaMessage(remove_media_keys)
    
    const output: UpdateNotesOutput = { error }
    if (items) {
      output.notes = noteItemToNoteItemOutputList(items)
    }
    return output
  }

  public async deleteNotes(input: DeleteNotesInput): Promise<void> {
    const mediaKeys: string[] = await this.db.deleteMultipleNotes(
      input.user_id,
      input.note_ids
    );
    await this.enqueuDeleteMediaMessage(mediaKeys);
  }

  private async enqueuDeleteMediaMessage(keys: string[]): Promise<void> {
    if (keys.length == 0) return;

    const message: QueueMessage = {
      source_type: QueueMessageSourceType.NOTE_SERVICE,
      event_type: QueueMessageEventType.DELETE_MEDIAS,
      body: { keys },
    };

    await this.queue.enqueueMessage(message);
  }

  private createNoteMediaItem(PK: string, SK: string, data: Record<string,any>): NoteMediaItem {
    const { global_id, type, size} = data;
    const key = this.storage.createMediaObjectKey(PK,SK)
    return {
      global_id,
      type,
      size,
      key,
      url: this.storage.getMediaUrl(key),
      status: NoteMediaStatus.NOT_AVAILABLE,
    };
  }
}
