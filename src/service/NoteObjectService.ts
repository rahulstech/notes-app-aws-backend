export interface MediaPutUrlOptions {
    media_key: string,
    media_type: string,
    media_size: number
}

export interface MediaPutUrlOutput {
    url: string
    method: string,
    expires: number,
    expires_in: number
}

export interface NoteObjectService {

    getMediaPutUrl(options: MediaPutUrlOptions): Promise<MediaPutUrlOutput>
}