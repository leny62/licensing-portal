DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'FitAndProperStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "FitAndProperStatus" AS ENUM ('PENDING', 'CLEARED', 'FAILED');
  END IF;
END
$$;

ALTER TABLE significant_shareholders
  ADD COLUMN IF NOT EXISTS fit_and_proper_status "FitAndProperStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS fit_and_proper_reviewed_at TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS fit_and_proper_reviewed_by_id UUID,
  ADD COLUMN IF NOT EXISTS fit_and_proper_justification TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'significant_shareholders_fit_and_proper_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE significant_shareholders
      ADD CONSTRAINT significant_shareholders_fit_and_proper_reviewed_by_id_fkey
      FOREIGN KEY (fit_and_proper_reviewed_by_id)
      REFERENCES users(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS significant_shareholders_application_id_fit_and_proper_status_idx
ON significant_shareholders(application_id, fit_and_proper_status);
