import { createHash } from 'node:crypto';

export const GENESIS_PREVIOUS_HASH = Buffer.alloc(32, 0);

type CanonicalValue = string | number | boolean | Date | null | CanonicalValue[] | CanonicalObject;
type CanonicalObject = { [key: string]: CanonicalValue | undefined };

const sortKeysByUtf8 = (keys: string[]): string[] => {
  return [...keys].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
};

const formatTimestamp = (value: Date): string => {
  return value.toISOString();
};

const canonicalJson = (value: CanonicalValue | undefined): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return JSON.stringify(formatTimestamp(value));
  }

  if (typeof value === 'string') {
    return JSON.stringify(value.normalize('NFC'));
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error('Audit canonicalisation only supports integer numbers.');
    }

    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => canonicalJson(entry))
      .filter((entry): entry is string => entry !== undefined);

    return `[${entries.join(',')}]`;
  }

  const entries = sortKeysByUtf8(Object.keys(value))
    .map((key) => {
      const rendered = canonicalJson(value[key]);

      if (rendered === undefined) {
        return undefined;
      }

      return `${JSON.stringify(key.normalize('NFC'))}:${rendered}`;
    })
    .filter((entry): entry is string => entry !== undefined);

  return `{${entries.join(',')}}`;
};

const toCanonicalValue = (value: unknown): CanonicalValue | undefined => {
  if (value === undefined || value === null) {
    return value;
  }

  if (
    value instanceof Date ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toCanonicalValue(entry))
      .filter((entry): entry is CanonicalValue => entry !== undefined);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, toCanonicalValue(entry)] as const)
        .filter(([, entry]) => entry !== undefined),
    ) as CanonicalObject;
  }

  throw new Error(`Unsupported audit canonicalisation value: ${typeof value}`);
};

export const canonicalise = (entry: Record<string, unknown>): Buffer => {
  const rendered = canonicalJson(toCanonicalValue(entry));

  if (rendered === undefined) {
    return Buffer.from('{}');
  }

  return Buffer.from(rendered, 'utf8');
};

export const entryHash = (
  entry: Record<string, unknown>,
  previousHash: Buffer = GENESIS_PREVIOUS_HASH,
): Buffer => {
  return createHash('sha256').update(canonicalise(entry)).update(previousHash).digest();
};
