export interface MediaObject {
    key: string,
    mime_type: string,
    size: number,
}

export interface MediaUploadUrlInput {
    id: string,
    key: string,
    mime_type: string,
    size: number
}

export type MediaUploadHttpMethod = 'PUT' | 'POST'

export interface MediaUploadUrlOutput {
    id: string,
    upload_url: string,
    upload_http_method: MediaUploadHttpMethod,
    expire: number,
    expires_in: number
}

export default interface NoteObjectService {

    getMediaUploadUrl(input: MediaUploadUrlInput): Promise<MediaUploadUrlOutput>

    getMediaMeta(key: string): Promise<MediaObject>

    getMediaUrl(key: string): string

    deleteMultipleMedias(keys: string[]): Promise<void>

    createMediaObjectKey(user_id: string, note_id: string): string
}