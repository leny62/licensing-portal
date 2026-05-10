export interface PutDocumentOptions {
  sizeHint?: number;
}

export interface StoredDocumentMetadata {
  storagePath: string;
  wrappedDek: Buffer;
  iv: Buffer;
  authTag: Buffer;
  bytesWritten: number;
}

export interface GetDocumentOptions {
  wrappedDek: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface DocumentStorage {
  put(stream: NodeJS.ReadableStream, opts?: PutDocumentOptions): Promise<StoredDocumentMetadata>;
  get(storagePath: string, opts: GetDocumentOptions): NodeJS.ReadableStream;
  delete(storagePath: string): Promise<void>;
}
