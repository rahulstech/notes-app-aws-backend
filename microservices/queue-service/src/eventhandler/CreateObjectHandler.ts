import { NoteRepository, splitNoteMediaKey, UpdateMediaStatusItem } from "@note-app/note-repository";
import { NoteMediaStatus } from "@notes-app/database-service";
import { QueueMessage } from "@notes-app/queue-service";
import { executeBatch, LOGGER } from "@notes-app/common";
import { AuthRepository } from '@notes-app/auth-repository';
import { EventHandler, HandleEventOutput } from "../types";

const LOG_TAG = "CreateObjectHandler";

/**
 * Handles CREATE_OBJECT events from the queue.
 * Groups incoming media keys by user_id/note_id and updates their status.
 */
export class CreateObjectHandler implements EventHandler {
  constructor(
    private noteRepository: NoteRepository,
    private authRespository: AuthRepository
  ) {}

  public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    const profilePhotoMessages: QueueMessage[] = [];
    const noteMediaMessages: QueueMessage[] = [];
    const unknownMessages: QueueMessage[] = [];

    messages.forEach(msg => {
      const key = msg.body?.key;
      const bucket = msg.body?.bucket;

      if (!key || !bucket) {
        unknownMessages.push(msg);
        LOGGER.logWarn("Queue message missing bucket/key", { bucket, key });
        return;
      }

      if (this.authRespository.isProfilePhotoKey(key)) {
        profilePhotoMessages.push(msg);
      } else if (this.noteRepository.isNoteMediaKey(key)) {
        noteMediaMessages.push(msg);
      } else {
        unknownMessages.push(msg);
        LOGGER.logWarn("Queue message with unknown key prefix", { bucket, key });
      }
    });

    // Call the respective handlers
    const [mediaOutput, photoOutput] = await Promise.all([
      this.handleNoteMediaMessages(noteMediaMessages),
      this.handleProfilePhotoMessages(profilePhotoMessages)
    ]);

    // Unknown messages are directly consumed
    const consumed = [
      ...mediaOutput.consumed,
      ...photoOutput.consumed,
      ...unknownMessages, // we can not handle the unknow keys so no need to retry, therefore simply remove from queue
    ];

    return { consumed };
  }

  /** Handles note media messages (medias/) */
  private async handleNoteMediaMessages(messages: QueueMessage[]): Promise<HandleEventOutput> {
    if (!messages.length) return { consumed: [] };

    const userNoteMediaMap = this.groupMessagesByUserAndNote(messages);
    const consumed = await this.updateMedias(userNoteMediaMap);

    return { consumed };
  }

  /** Groups messages into user_id → note_id → UpdateMediaStatusItem[] */
  private groupMessagesByUserAndNote(
    messages: QueueMessage[]
  ): Record<string, Record<string, UpdateMediaStatusItem[]>> {
    const map: Record<string, Record<string, UpdateMediaStatusItem[]>> = {};

    messages.forEach((message, index) => {
      const parts = splitNoteMediaKey(message.body.key);
      if (parts === null) return;

      const { user_id, note_id, media_id } = parts;
      (map[user_id] ??= {})[note_id] ??= [];
      map[user_id][note_id].push({
        media_id,
        status: NoteMediaStatus.AVAILABLE,
        extras: message, // keep a reference of the message
      });
    });
    return map;
  }

  /** Updates media status in DB and returns indices of successfully updated messages */
  private async updateMedias(userNoteMediaMap: Record<string, Record<string, UpdateMediaStatusItem[]>>): Promise<QueueMessage[]> {
    const output = await executeBatch(
      Object.entries(userNoteMediaMap),
      async ([PK, mediasByNote]) => {
        try {
          const { items } = await this.noteRepository.updateMediaStatus({ PK, inputs: mediasByNote });
          return items.map(({ extras }) => extras as QueueMessage);
        } 
        catch(error) {
          return [];
        }
      },
      25,
      100
    );
    return output.flat();
  }

  /** Handles profile photo messages (photos/) */
  private async handleProfilePhotoMessages(messages: QueueMessage[]): Promise<HandleEventOutput> {
    if (!messages.length) return { consumed: [] };
    
    const results = await Promise.allSettled(messages.map(message => {
      return this.authRespository.updateProfilePhoto(message.body.key);
    }));

    return results.reduce<HandleEventOutput>((acc,result,index) => {
      const message = messages[index];
      if (result.status === 'fulfilled') {
        (acc.consumed ??= []).push(message);
      }
      else {
        LOGGER.logError("profile photo not updated",{ 
          tag: LOG_TAG, 
          method: "handleProfilePhotoMessages", 
          key: message.body.key,
          error: result.reason,
        });
      }
      return acc;
    }, {});
  }
}
