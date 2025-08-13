export interface MediaUploadOptions {
    id: string,
    user_id: string,
    note_id: string,
    mime_type: string,
    size: number
}

export interface MediaUpload {
    url: string,
    http_method: string,
    expires: number,
    expires_in: number,
}

export interface MediaResource {
    url: string,
    key: string,
}

export interface MediaUploadOutput {
    id: string,
    upload: MediaUpload,
    resource: MediaResource,
}

export interface MediaObject {
    key: string,
    mime_type: string,
    size: number,
}

export default interface NoteObjectService {

    uploadMedia(options: MediaUploadOptions): Promise<MediaUploadOutput>

    getMediaMeta(key: string): Promise<MediaObject>

    getMediaUrl(key: string): string

    deleteMultipleMedias(keys: string[]): Promise<void>
}