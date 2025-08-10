import MediaObjectEntry from "./model/MediaObjectEntry"

export interface MediaUploadUrlOptions {
    user_id: string,
    note_id: string,
    media_type: string,
    media_size: number
}

export interface MediaUploadUrl {
    url: string
    method: string,
    expires: number,
    expires_in: number
}


export default interface NoteObjectService {

    getMediaUploadUrl(options: MediaUploadUrlOptions): Promise<MediaUploadUrl>

    getMediaMeta(key: string): Promise<MediaObjectEntry>
}