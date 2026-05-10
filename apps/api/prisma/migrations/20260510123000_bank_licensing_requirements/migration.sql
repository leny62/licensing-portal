CREATE TYPE "BankCategory" AS ENUM (
  'COMMERCIAL_BANK',
  'DEVELOPMENT_BANK',
  'COOPERATIVE_BANK',
  'MORTGAGE_BANK'
);

ALTER TABLE applications
ADD COLUMN bank_category "BankCategory" NOT NULL DEFAULT 'COMMERCIAL_BANK',
ADD COLUMN paid_up_capital_rwf numeric(20, 0) NOT NULL DEFAULT 20000000000;

CREATE INDEX applications_bank_category_idx
ON applications(bank_category);
