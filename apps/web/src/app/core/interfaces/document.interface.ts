export interface ApplicationDocumentResponse {
  id: string;
  applicationId: string;
  slot: string;
  version: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface UploadDocumentResult {
  documentId: string;
  slot: string;
  version: number;
  fileName: string;
}
