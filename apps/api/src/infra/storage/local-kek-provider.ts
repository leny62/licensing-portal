import { createCipheriv, createDecipheriv } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KekProvider } from './interfaces/kek-provider.interface';

const AES_KEY_WRAP_ALGORITHM = 'id-aes256-wrap';
const AES_KEY_WRAP_DEFAULT_IV = Buffer.alloc(8, 0xa6);
const KEK_LENGTH_BYTES = 32;

@Injectable()
export class LocalKekProvider implements KekProvider {
  private readonly kek: Buffer;

  constructor(configService: ConfigService) {
    this.kek = configService.getOrThrow<Buffer>('documents.keyEncryptionKey');

    if (this.kek.byteLength !== KEK_LENGTH_BYTES) {
      throw new Error('DOCUMENT_KEK_BASE64 must decode to 32 bytes.');
    }
  }

  async wrap(dek: Buffer): Promise<Buffer> {
    const cipher = createCipheriv(AES_KEY_WRAP_ALGORITHM, this.kek, AES_KEY_WRAP_DEFAULT_IV);

    return Buffer.concat([cipher.update(dek), cipher.final()]);
  }

  async unwrap(wrapped: Buffer): Promise<Buffer> {
    const decipher = createDecipheriv(AES_KEY_WRAP_ALGORITHM, this.kek, AES_KEY_WRAP_DEFAULT_IV);

    return Buffer.concat([decipher.update(wrapped), decipher.final()]);
  }
}
