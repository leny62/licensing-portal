import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { PassThrough, Transform, TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DocumentStorage,
  GetDocumentOptions,
  PutDocumentOptions,
  StoredDocumentMetadata,
} from './interfaces/document-storage.interface';
import { KekProvider } from './interfaces/kek-provider.interface';
import { KEK_PROVIDER } from './storage.tokens';

const DEK_LENGTH_BYTES = 32;
const GCM_IV_LENGTH_BYTES = 12;
const STORAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ByteCounter extends Transform {
  bytesWritten = 0;

  override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.bytesWritten += chunk.byteLength;
    callback(null, chunk);
    void encoding;
  }
}

@Injectable()
export class EncryptedLocalStorage implements DocumentStorage {
  private readonly storageRoot: string;

  constructor(
    configService: ConfigService,
    @Inject(KEK_PROVIDER) private readonly kekProvider: KekProvider,
  ) {
    this.storageRoot = path.resolve(configService.getOrThrow<string>('documents.storageRoot'));
  }

  async put(
    stream: NodeJS.ReadableStream,
    opts?: PutDocumentOptions,
  ): Promise<StoredDocumentMetadata> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });

    const storagePath = randomUUID();
    const absolutePath = this.resolveStoragePath(storagePath);
    const dek = randomBytes(DEK_LENGTH_BYTES);
    const iv = randomBytes(GCM_IV_LENGTH_BYTES);
    const cipher = createCipheriv('aes-256-gcm', dek, iv);
    const counter = new ByteCounter();

    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await pipeline(stream, counter, cipher, createWriteStream(absolutePath, { mode: 0o600 }));
    } catch (error) {
      await rm(absolutePath, { force: true });
      throw error;
    }

    const bytesWritten = counter.bytesWritten;

    if (opts?.sizeHint !== undefined && opts.sizeHint !== bytesWritten) {
      await rm(absolutePath, { force: true });
      throw new Error('Document stream ended before the declared size was written.');
    }

    return {
      storagePath,
      wrappedDek: await this.kekProvider.wrap(dek),
      iv,
      authTag: cipher.getAuthTag(),
      bytesWritten,
    };
  }

  get(storagePath: string, opts: GetDocumentOptions): NodeJS.ReadableStream {
    const output = new PassThrough();
    const absolutePath = this.resolveStoragePath(storagePath);

    void this.kekProvider
      .unwrap(opts.wrappedDek)
      .then(async (dek) => {
        const decipher = createDecipheriv('aes-256-gcm', dek, opts.iv);
        decipher.setAuthTag(opts.authTag);

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await pipeline(createReadStream(absolutePath), decipher, output);
      })
      .catch((error) => output.destroy(error as Error));

    return output;
  }

  async delete(storagePath: string): Promise<void> {
    await rm(this.resolveStoragePath(storagePath), { force: true });
  }

  private resolveStoragePath(storagePath: string): string {
    if (!STORAGE_PATH_PATTERN.test(storagePath)) {
      throw new Error('Invalid document storage path.');
    }

    return path.join(this.storageRoot, storagePath);
  }
}
