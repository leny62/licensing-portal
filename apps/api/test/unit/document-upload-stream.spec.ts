import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';

import { ConflictError } from '../../src/common/errors/domain.errors';
import { prepareDocumentUploadStream } from '../../src/modules/documents/upload-stream';

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

describe('prepareDocumentUploadStream', () => {
  it('accepts an allowed MIME type and preserves bytes', async () => {
    const prepared = await prepareDocumentUploadStream(Readable.from([pngBytes]), 5 * 1024 * 1024);
    const returned = await buffer(prepared.stream);

    expect(prepared.mimeType).toBe('image/png');
    expect(returned.equals(pngBytes)).toBe(true);
  });

  it('rejects unsupported MIME types', async () => {
    await expect(
      prepareDocumentUploadStream(Readable.from([Buffer.from('plain text')]), 5 * 1024 * 1024),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects streams above the byte cap before storage', async () => {
    await expect(
      prepareDocumentUploadStream(Readable.from([Buffer.alloc(11)]), 10),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
