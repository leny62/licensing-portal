export interface ApplicationDocumentResponse {
  id: string;
  applicationId: string;
  slot: string;
  version: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface UploadDocumentInput {
  applicationId: string;
  slot: string;
  originalFilename: string;
  stream: NodeJS.ReadableStream;
}
