export interface MediaObject {
    key: string;
    mime_type: string;
    size: number;
  }
  
  export interface ObjectUploadUrlInput {
    key: string;
    mime_type: string;
    size: number;
    expires_in?: number;
  }
  
  export type ObjectUploadHttpMethod = 'PUT' | 'POST';
  
  export interface ObjectUploadUrlOutput {
    url: string;
    http_method: ObjectUploadHttpMethod;
    expire: number;
    expires_in: number;
  }