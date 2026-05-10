import { BankCategory } from '@prisma/client';

import {
  meetsMinimumPaidUpCapital,
  requiredPaidUpCapitalRwf,
} from '../../src/modules/applications/capital-requirements';

describe('bank licensing capital requirements', () => {
  it.each([
    [BankCategory.COMMERCIAL_BANK, 20000000000],
    [BankCategory.DEVELOPMENT_BANK, 50000000000],
    [BankCategory.COOPERATIVE_BANK, 10000000000],
    [BankCategory.MORTGAGE_BANK, 10000000000],
  ])('returns the minimum paid-up capital for %s', (category, minimum) => {
    expect(requiredPaidUpCapitalRwf(category)).toBe(minimum);
  });

  it('rejects capital below the category minimum', () => {
    expect(meetsMinimumPaidUpCapital(BankCategory.DEVELOPMENT_BANK, 49999999999)).toBe(false);
  });

  it('accepts capital at the category minimum', () => {
    expect(meetsMinimumPaidUpCapital(BankCategory.DEVELOPMENT_BANK, 50000000000)).toBe(true);
  });
});
