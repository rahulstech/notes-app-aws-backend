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
  AddMediasInput,
  AddMediasOutput,
  RemoveMediasInput,
  RemoveMediasOutput,
  UpdateMediaStatusInput,
  AddMediaInputItem,
  AddMediaOutputItem,
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
import { createNoteMediaKey, noteItemToNoteItemOutput, noteItemToNoteItemOutputList, shortNoteItemToNoteItemOutputList } from '../utils';
import { AppError, decodeBase64, renameKeys } from '@notes-app/common';

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
        timestamp_modified
      }) => {
        const SK = this.db.createNoteId();
        const short_content = NoteItem.createShortContent(content)
        return new NoteItem(
          PK,
          SK,
          global_id,
          title,
          content,
          short_content,
          timestamp_created,
          timestamp_modified
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

  public async updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput> {
    const { user_id: PK, notes } = input

    const updateInputs: UpdateNoteDataInput[] = notes.map(note => 
      renameKeys(note,{ "note_id": "SK"}) as UpdateNoteDataInput
    )

    // update db items
    const { items, fail, error } = await this.db.updateMultipleNotes(PK,updateInputs)
    
    
    const output: UpdateNotesOutput = { error }
    if (items) {
      output.notes = noteItemToNoteItemOutputList(items)
    }
    return output
  }

  public async addMedias(input: AddMediasInput): Promise<AddMediasOutput> {
    const { user_id: PK, note_medias } = input

    const outputs = await Promise.all(Object.entries(note_medias).map(async ([SK,media_inputs]) => {
      try {
        const medias = await this.addMediasForNote(PK,SK,media_inputs)
        return { medias }
      }
      catch(error) {
        console.log(error) // TODO: remove log
        return { error: new AppError(0) }
      }
    }))

    return outputs.reduce<AddMediasOutput>((acc,{medias,error}) => {
      if (medias) {
        if (!acc.medias) {
          acc.medias = []
        }
        acc.medias = acc.medias.concat(medias)
      }
      return acc
    },{})
  }

  private async addMediasForNote(PK: string, SK: string, mediaInputs: AddMediaInputItem[]): Promise<AddMediaOutputItem[]> {
    const itemsExists: NoteMediaItem[] = []
    const itemsNonExists: NoteMediaItem[] = []
    mediaInputs.forEach(({global_id,type,size,key: existing_key}) => {
      const key = existing_key ?? createNoteMediaKey(PK,SK,global_id);
      const item = {
        global_id,
        key,
        url: this.storage.getMediaUrl(key),
        type,
        size,
        status: NoteMediaStatus.NOT_AVAILABLE,
      }
      if (existing_key) {
        itemsExists.push(item)
      }
      else {
        itemsNonExists.push(item)
      }
    })

    let itemsForKey: NoteMediaItem[] = itemsExists
    // add media entries if any non-exists
    if (itemsNonExists.length > 0) {
      const newItems = await this.db.addNoteMedias(PK,SK,itemsNonExists)
      itemsForKey = [ ...itemsExists, ...newItems ]
    }
    if (itemsForKey.length === 0) {
      return []
    }

    // generate upload urls for each new medias
    const { medias } = await this.generateMediaUploadUrls(itemsForKey)
    return medias || []
  }

  private async generateMediaUploadUrls(medias: NoteMediaItem[]): Promise<AddMediasOutput> {
    const outputs = await Promise.all(medias.map(async (mediaOutput) => {
      const {key,type: mime_type,size} = mediaOutput
      try {
        const urlOutput = await this.storage.getObjectUploadUrl({
          key,
          mime_type,
          size,
          expires_in: NOTE_MEDIAS_UPLOAD_URL_EXPIRES_IN_SECONDS
        })
        return { media: { ...mediaOutput, ...urlOutput }, suceessful: true }
      }
      catch(error) {
        return { media: mediaOutput, suceessful: false, error: error as AppError }
      }
    }))

    const output: AddMediasOutput = {}
    outputs.forEach(({media,suceessful}) => {
      if (!output.medias) {
        output.medias = []
      }
      output.medias.push(media)
      if (!suceessful) {
        if (!output.failure) {
          output.failure = []
        }
        output.failure.push(media.global_id)
      }
    })

    return output
  }

  public async updateMediaStatus(input: UpdateMediaStatusInput): Promise<void> {
    const { user_id: PK, medias } = input

    const promises = Object.keys(medias).map(async (SK) => {
      const items = medias[SK].map(item => ({
        ...item,
        global_id: this.getMediaGlobalIdFromKey(item.key)
      }))
      try {
        await this.db.updateMediaStatus(PK,SK,items)
      }
      catch(error) {
        console.log(error) // TODO: remove log
      }
    })

    await Promise.all(promises)
  }

  public async removeMedias(input: RemoveMediasInput): Promise<RemoveMediasOutput> {
    const { user_id: PK, note_medias } = input
    const outputs = await Promise.all(Object.entries(note_medias).map(async ([SK,keyGids]) => {
      try {
        const keys = await this.db.removeNoteMedias(PK,SK,keyGids)
        return { keys }
      }
      catch(error) {
        console.log(error) // TODO: remove log
        return { SK, failure: keyGids }
      }
    }))

    const output: RemoveMediasOutput = {}
    let allKeys: string[] = []

    outputs.forEach(({keys,SK,failure}) => {
      if (keys) {
        allKeys = allKeys.concat(keys)
      }
      else {
        if (!output.failure) {
          output.failure = {}
        }
        output.failure[SK] = failure
      }
    })

    await this.enqueuDeleteMediasMessage(allKeys)

    return output
  }

  public async deleteNotes(input: DeleteNotesInput): Promise<void> {
    const { user_id, note_ids } = input
    const noteIdsNotDeleted: string[] = await this.db.deleteMultipleNotes(
      user_id,
      note_ids
    );

    let successfullyDeleteIds = note_ids
    if (noteIdsNotDeleted.length > 0) {
      const set = new Set(noteIdsNotDeleted)
      successfullyDeleteIds = noteIdsNotDeleted.filter(id => !set.has(id))
    }

    await this.enqueuDeleteNotesMessage(user_id,successfullyDeleteIds);
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

  private async enqueuDeleteNotesMessage(PK: string, SKs: string[]) {
    if (SKs.length == 0) return;

    const message: QueueMessage = {
      source_type: QueueMessageSourceType.NOTE_SERVICE,
      event_type: QueueMessageEventType.DELETE_NOTES,
      body: { prefixes: SKs.map(SK => createNoteMediaKey(PK,SK)) },
    };

    await this.queue.enqueueMessage(message);
  }

  private getMediaGlobalIdFromKey(key: string): string {
    const paths = key.split('/')
    const enc_gid = paths[paths.length-1]
    return decodeBase64(enc_gid)
  } 
}
