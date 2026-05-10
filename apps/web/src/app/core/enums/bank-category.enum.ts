export enum BankCategory {
  CommercialBank = 'COMMERCIAL_BANK',
  DevelopmentBank = 'DEVELOPMENT_BANK',
  CooperativeBank = 'COOPERATIVE_BANK',
  MortgageBank = 'MORTGAGE_BANK',
}

export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  [BankCategory.CommercialBank]: 'Commercial bank',
  [BankCategory.DevelopmentBank]: 'Development bank',
  [BankCategory.CooperativeBank]: 'Cooperative bank',
  [BankCategory.MortgageBank]: 'Mortgage bank',
};

export const BANK_CATEGORY_MINIMUM_CAPITAL_RWF: Record<BankCategory, number> = {
  [BankCategory.CommercialBank]: 20000000000,
  [BankCategory.DevelopmentBank]: 50000000000,
  [BankCategory.CooperativeBank]: 10000000000,
  [BankCategory.MortgageBank]: 10000000000,
};
