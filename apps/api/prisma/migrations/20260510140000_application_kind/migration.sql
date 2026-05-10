CREATE TYPE "ApplicationKind" AS ENUM (
  'NEW_BANK',
  'FOREIGN_SUBSIDIARY',
  'REPRESENTATIVE_OFFICE'
);

ALTER TABLE applications
ADD COLUMN application_kind "ApplicationKind" NOT NULL DEFAULT 'NEW_BANK';

CREATE INDEX applications_application_kind_idx
ON applications(application_kind);

GRANT USAGE ON TYPE "ApplicationKind" TO licensing_app, licensing_migrate;

