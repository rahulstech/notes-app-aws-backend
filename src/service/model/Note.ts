export interface NoteMediaInput {
    global_id: string,
    type: string,
    size: number,
}

export enum NoteMediaStatus {
    AVAILABLE = "AVAILABLE",
    NOT_AVAILABLE = "NOT_AVAILABLE"
}

export interface NoteMedia {
    url: string,
    key: string,
    type: string,
    size: number,
    global_id: string,
    status: NoteMediaStatus,
}

export interface CreateNoteInput {
    user_id: string,
    global_id: string,
    title: string,
    content: string,
    medias?: NoteMediaInput[],
    note_id?: string
}

export interface UpdateNoteInput {
    user_id: string,
    note_id: string
    title?: string,
    content?: string,
    add_medias?: NoteMediaInput[],
    remove_medias?: string[]
}

export default class Note {
    constructor(
        public global_id: string,
        public title: string,
        public content: string,
        public user_id: string = "GUEST",
        public medias?: Record<string, NoteMedia>,
        public note_id?: string,
    ) {}

    toJSON(): object {
        const note: Record<string,any> = { ...this }
        if (this.medias) {
            note.medias = Object.values(this.medias)
        }
        return note
    }

    toDBItem(): Record<string,any> {
        const Item: Record<string, any> = {...this}
        if (!this.medias) {
            Item.medias = {}
        }
        return Item
    }

    static fromDBItem(item: Record<string,any>): Note {
        return new Note(
            item.global_id,
            item.title,
            item.content,
            item.user_id,
            item.medias,
            item.note_id
        )
    }
}