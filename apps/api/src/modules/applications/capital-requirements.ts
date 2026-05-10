import { BankCategory } from '@prisma/client';

export const BANK_CATEGORY_MINIMUM_CAPITAL_RWF: Record<BankCategory, number> = {
  [BankCategory.COMMERCIAL_BANK]: 20000000000,
  [BankCategory.DEVELOPMENT_BANK]: 50000000000,
  [BankCategory.COOPERATIVE_BANK]: 10000000000,
  [BankCategory.MORTGAGE_BANK]: 10000000000,
};

export const requiredPaidUpCapitalRwf = (category: BankCategory): number =>
  BANK_CATEGORY_MINIMUM_CAPITAL_RWF[category];

export const meetsMinimumPaidUpCapital = (
  category: BankCategory,
  paidUpCapitalRwf: number,
): boolean => paidUpCapitalRwf >= requiredPaidUpCapitalRwf(category);
