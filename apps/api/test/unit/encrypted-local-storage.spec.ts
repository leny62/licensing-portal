import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';

import { ConfigService } from '@nestjs/config';

import { EncryptedLocalStorage } from '../../src/infra/storage/encrypted-local-storage';
import { LocalKekProvider } from '../../src/infra/storage/local-kek-provider';

const createConfigService = (storageRoot: string, kek: Buffer): ConfigService => {
  return {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'documents.storageRoot') {
        return storageRoot;
      }

      if (key === 'documents.keyEncryptionKey') {
        return kek;
      }

      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService;
};

describe('EncryptedLocalStorage', () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(tmpdir(), 'encrypted-storage-'));
  });

  afterEach(async () => {
    await rm(storageRoot, { force: true, recursive: true });
  });

  it('round-trips put/get with identical plaintext bytes', async () => {
    const plaintext = Buffer.from('bank licensing document bytes');
    const config = createConfigService(storageRoot, Buffer.alloc(32, 7));
    const storage = new EncryptedLocalStorage(config, new LocalKekProvider(config));

    const stored = await storage.put(Readable.from([plaintext]));
    const returned = await buffer(storage.get(stored.storagePath, stored));

    expect(stored.bytesWritten).toBe(plaintext.byteLength);
    expect(returned.equals(plaintext)).toBe(true);
  });

  it('fails GCM authentication when ciphertext is tampered', async () => {
    const plaintext = Buffer.from('sensitive document bytes');
    const config = createConfigService(storageRoot, Buffer.alloc(32, 9));
    const storage = new EncryptedLocalStorage(config, new LocalKekProvider(config));
    const stored = await storage.put(Readable.from([plaintext]));
    const ciphertextPath = path.join(storageRoot, stored.storagePath);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const ciphertext = await readFile(ciphertextPath);

    ciphertext[0] = (ciphertext[0] ?? 0) ^ 0xff;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(ciphertextPath, ciphertext);

    await expect(buffer(storage.get(stored.storagePath, stored))).rejects.toThrow();
  });
});
