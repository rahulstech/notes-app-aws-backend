import { NoteRepository, splitNoteMediaKey, UpdateMediaStatusItem } from "@note-app/note-repository";
import { NoteMediaStatus } from "@notes-app/database-service";
import { QueueMessage } from "@notes-app/queue-service";
import { executeBatch } from "@notes-app/common";
import { EventHandler, HandleEventOutput } from "../types";

/**
 * Handles CREATE_OBJECT events from the queue.
 * Groups incoming media keys by user_id/note_id and updates their status.
 */
export class CreateObjectHandler implements EventHandler {
  constructor(
    private readonly noteRepository: NoteRepository
  ) {}

  public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    // Step 1: Group messages by user_id → note_id
    const userNoteMediaMap = this.groupMessagesByUserAndNote(messages);

    // Step 2: Update DB for each user
    const consumedIndices = await this.updateMedias(userNoteMediaMap);

    // Step 3: Map consumed indices back to original messages
    const consumed = consumedIndices.map((i) => messages[i]);
    
    return { consumed };
  }

  /**
   * Groups incoming messages into a nested map:
   * {
   *   user_id: {
   *     note_id: [ UpdateMediaStatusItem, ... ]
   *   }
   * }
   */
  private groupMessagesByUserAndNote(
    messages: QueueMessage[]
  ): Record<string, Record<string, UpdateMediaStatusItem[]>> {
    const map: Record<string, Record<string, UpdateMediaStatusItem[]>> = {};

    messages.forEach((message, index) => {
      const parts = splitNoteMediaKey(message.body.key);
      if (null === parts) {
        return;
      }
      const { user_id, note_id, media_id } = parts;
      (map[user_id] ??= {})[note_id] ??= [];
      map[user_id][note_id].push({
        media_id,
        status: NoteMediaStatus.AVAILABLE,
        extras: index, // keep track of original index
      });
    });

    return map;
  }

  /**
   * Updates DynamoDB for each user_id in parallel.
   * Returns the indices of successfully consumed messages.
   */
  private async updateMedias(userNoteMediaMap: Record<string, Record<string, UpdateMediaStatusItem[]>>): Promise<number[]> {
    const output = await executeBatch(
      Object.entries(userNoteMediaMap),
      async ([PK,mediasByNote]) => {
        try {
          const { items } = await this.noteRepository.updateMediaStatus({PK,inputs: mediasByNote});
          return items.map(({ extras }) => extras as number);
        } catch (error) {
          return [];
        }
      },
      25,
      100
    );
    return output.flat();
  }
}



