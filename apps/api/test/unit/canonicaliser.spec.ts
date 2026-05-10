import {
  canonicalise,
  entryHash,
  GENESIS_PREVIOUS_HASH,
} from '../../src/infra/audit/canonicaliser';

describe('audit canonicaliser', () => {
  it('is stable across object key reordering', () => {
    const left = canonicalise({
      action: 'submit',
      payload: { b: 2, a: 1 },
      clockOffsetMs: 0,
    });
    const right = canonicalise({
      clockOffsetMs: 0,
      payload: { a: 1, b: 2 },
      action: 'submit',
    });

    expect(left.equals(right)).toBe(true);
  });

  it('is stable across NFC and NFD strings', () => {
    const nfc = canonicalise({ justification: 'Café' });
    const nfd = canonicalise({ justification: 'Cafe\u0301' });

    expect(nfc.equals(nfd)).toBe(true);
  });

  it('changes the hash when canonical input is tampered', () => {
    const original = entryHash({ action: 'submit', rowVersion: 1 });
    const tampered = entryHash({ action: 'submit', rowVersion: 2 });

    expect(original.equals(tampered)).toBe(false);
  });

  it('uses 32 zero bytes as the genesis previous hash', () => {
    expect(GENESIS_PREVIOUS_HASH.equals(Buffer.alloc(32, 0))).toBe(true);
    expect(
      entryHash({ action: 'submit' }).equals(entryHash({ action: 'submit' }, Buffer.alloc(32, 0))),
    ).toBe(true);
  });
});
