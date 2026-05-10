import { Readable } from 'node:stream';

import { ConflictError } from '../../common/errors/domain.errors';

const SNIFF_BYTES = 4100;

export interface PreparedUploadStream {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  bytesReadBeforeStorage: number;
}

export const prepareDocumentUploadStream = async (
  source: NodeJS.ReadableStream,
  maxBytes: number,
): Promise<PreparedUploadStream> => {
  const iterator = source[Symbol.asyncIterator]();
  const prefixChunks: Buffer[] = [];
  let sniffedBytes = 0;
  let totalBytes = 0;
  let done = false;

  while (sniffedBytes < SNIFF_BYTES && !done) {
    const result = await iterator.next();

    if (result.done === true) {
      done = true;
      break;
    }

    const chunk = Buffer.isBuffer(result.value) ? result.value : Buffer.from(result.value);
    totalBytes += chunk.byteLength;

    if (totalBytes > maxBytes) {
      throw new ConflictError('Document exceeds the configured size limit.');
    }

    prefixChunks.push(chunk);
    sniffedBytes += chunk.byteLength;
  }

  const prefix = Buffer.concat(prefixChunks);
  const mimeType = sniffMimeType(prefix);

  if (mimeType === undefined) {
    throw new ConflictError('Unsupported document MIME type.');
  }

  async function* cappedStream(): AsyncGenerator<Buffer> {
    if (prefix.byteLength > 0) {
      yield prefix;
    }

    while (!done) {
      const result = await iterator.next();

      if (result.done === true) {
        done = true;
        return;
      }

      const chunk = Buffer.isBuffer(result.value) ? result.value : Buffer.from(result.value);
      totalBytes += chunk.byteLength;

      if (totalBytes > maxBytes) {
        throw new ConflictError('Document exceeds the configured size limit.');
      }

      yield chunk;
    }
  }

  return {
    stream: Readable.from(cappedStream()),
    mimeType,
    bytesReadBeforeStorage: totalBytes,
  };
};

const sniffMimeType = (prefix: Buffer): string | undefined => {
  if (prefix.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return 'application/pdf';
  }

  if (prefix.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff) {
    return 'image/jpeg';
  }

  return undefined;
};
