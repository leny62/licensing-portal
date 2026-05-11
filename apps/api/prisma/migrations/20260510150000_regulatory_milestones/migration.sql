DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ApplicationState'
      AND e.enumlabel = 'CHANGES_REQUESTED'
  ) THEN
    ALTER TYPE "ApplicationState" RENAME VALUE 'CHANGES_REQUESTED' TO 'AWAITING_APPLICANT_RESPONSE';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShareholderType" AS ENUM ('NATURAL_PERSON', 'LEGAL_ENTITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeniorManagerRole" AS ENUM (
    'CHIEF_EXECUTIVE',
    'CHIEF_FINANCE',
    'CHIEF_RISK',
    'CHIEF_COMPLIANCE',
    'INTERNAL_AUDIT',
    'OPERATIONS',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplianceFindingSeverity" AS ENUM ('INFO', 'WARNING', 'BLOCKING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplianceFindingStatus" AS ENUM ('OPEN', 'RESOLVED', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationDecisionOutcome" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFORMATION', 'DEFER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InformationLetterStatus" AS ENUM ('ISSUED', 'RESPONDED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentSlot" AS ENUM (
    'APPLICANT_INFORMATION_SHEET',
    'SHAREHOLDER_INFORMATION_SHEET',
    'PERSONAL_DECLARATION',
    'CREDIT_REPORT',
    'CAPITAL_STRUCTURE',
    'BUSINESS_PLAN',
    'INCORPORATION_CERTIFICATE',
    'BOARD_RESOLUTION',
    'APPLICATION_FEE_PROOF',
    'FINANCIAL_STATEMENTS',
    'FIT_AND_PROPER_FORM',
    'HOME_SUPERVISOR_NO_OBJECTION',
    'HOME_SUPERVISOR_CONSOLIDATED_SUPERVISION',
    'HOME_SUPERVISOR_MOU_CONFIRMATION',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bank_category_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  category "BankCategory" NOT NULL,
  minimum_rwf BIGINT NOT NULL,
  CONSTRAINT bank_category_thresholds_pkey PRIMARY KEY (id),
  CONSTRAINT bank_category_thresholds_category_key UNIQUE (category)
);

INSERT INTO bank_category_thresholds (category, minimum_rwf)
VALUES
  ('COMMERCIAL_BANK', 20000000000),
  ('DEVELOPMENT_BANK', 50000000000),
  ('COOPERATIVE_BANK', 10000000000),
  ('MORTGAGE_BANK', 10000000000)
ON CONFLICT (category) DO UPDATE
SET minimum_rwf = EXCLUDED.minimum_rwf;

CREATE TABLE IF NOT EXISTS capital_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  amount_rwf BIGINT NOT NULL,
  source_summary TEXT NOT NULL,
  attested_at TIMESTAMPTZ(3) NOT NULL,
  attested_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT capital_declarations_pkey PRIMARY KEY (id),
  CONSTRAINT capital_declarations_application_id_key UNIQUE (application_id),
  CONSTRAINT capital_declarations_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT capital_declarations_attested_by_user_id_fkey
    FOREIGN KEY (attested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS significant_shareholders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  shareholder_type "ShareholderType" NOT NULL,
  full_name TEXT NOT NULL,
  registration_number TEXT,
  country TEXT NOT NULL,
  ownership_percent NUMERIC(5, 2) NOT NULL,
  source_of_funds TEXT NOT NULL,
  beneficial_owner TEXT,
  attested_at TIMESTAMPTZ(3) NOT NULL,
  attested_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT significant_shareholders_pkey PRIMARY KEY (id),
  CONSTRAINT significant_shareholders_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT significant_shareholders_attested_by_user_id_fkey
    FOREIGN KEY (attested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT significant_shareholders_ownership_percent_check
    CHECK (ownership_percent > 0 AND ownership_percent <= 100)
);

CREATE INDEX IF NOT EXISTS significant_shareholders_application_id_idx
ON significant_shareholders(application_id);

CREATE INDEX IF NOT EXISTS significant_shareholders_application_id_ownership_percent_idx
ON significant_shareholders(application_id, ownership_percent);

CREATE TABLE IF NOT EXISTS senior_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  role "SeniorManagerRole" NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  nationality TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  fit_and_proper_attested BOOLEAN NOT NULL DEFAULT false,
  attested_at TIMESTAMPTZ(3) NOT NULL,
  attested_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT senior_managers_pkey PRIMARY KEY (id),
  CONSTRAINT senior_managers_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT senior_managers_attested_by_user_id_fkey
    FOREIGN KEY (attested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT senior_managers_years_experience_check CHECK (years_experience >= 0)
);

CREATE INDEX IF NOT EXISTS senior_managers_application_id_idx
ON senior_managers(application_id);

CREATE INDEX IF NOT EXISTS senior_managers_application_id_role_idx
ON senior_managers(application_id, role);

CREATE TABLE IF NOT EXISTS document_slot_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  slot "DocumentSlot" NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_role "UserRole" NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  allowed_mime_types TEXT[] NOT NULL,
  max_bytes INTEGER NOT NULL,
  regulatory_basis TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_slot_specs_pkey PRIMARY KEY (id),
  CONSTRAINT document_slot_specs_slot_key UNIQUE (slot)
);

INSERT INTO document_slot_specs (slot, title, description, owner_role, required, allowed_mime_types, max_bytes, regulatory_basis)
VALUES
  ('APPLICANT_INFORMATION_SHEET', 'Applicant information sheet', 'Applicant and affiliate information.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(1)'),
  ('SHAREHOLDER_INFORMATION_SHEET', 'Significant shareholder information', 'Ownership and shareholder information.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Articles 5 and 11(1)'),
  ('PERSONAL_DECLARATION', 'Personal declarations', 'Declarations for shareholders, directors, and managers.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(2)'),
  ('CREDIT_REPORT', 'Credit reports', 'Credit reports for required persons.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(3)'),
  ('CAPITAL_STRUCTURE', 'Capital structure', 'Capital structure and funding sources.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(4)'),
  ('BUSINESS_PLAN', 'Business plan', 'Business model, projections, risk management, and controls.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Articles 6-8 and 11(5)'),
  ('INCORPORATION_CERTIFICATE', 'Incorporation documents', 'Certificate and constitutional documents.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(6)'),
  ('BOARD_RESOLUTION', 'Board or shareholder resolution', 'Certified authorisation resolution.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(8)'),
  ('APPLICATION_FEE_PROOF', 'Application fee proof', 'Proof of payment of application fee.', 'APPLICANT', true, ARRAY['application/pdf', 'image/png', 'image/jpeg'], 5242880, 'Articles 10 and 11(9)'),
  ('FINANCIAL_STATEMENTS', 'Audited financial statements', 'Audited statements for existing institutions.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 11(7)'),
  ('FIT_AND_PROPER_FORM', 'Fit and proper evidence', 'Fit and proper evidence for controlled persons.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Articles 5-8'),
  ('HOME_SUPERVISOR_NO_OBJECTION', 'Home supervisor no-objection', 'No-objection letter for foreign subsidiary application.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Articles 9 and 12(1)'),
  ('HOME_SUPERVISOR_CONSOLIDATED_SUPERVISION', 'Consolidated supervision confirmation', 'Home supervisor consolidated supervision confirmation.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 12(2)'),
  ('HOME_SUPERVISOR_MOU_CONFIRMATION', 'Supervisory cooperation statement', 'Home supervisor cooperation statement.', 'APPLICANT', true, ARRAY['application/pdf'], 5242880, 'Article 12(3)'),
  ('OTHER', 'Other document', 'Additional supporting evidence.', 'APPLICANT', false, ARRAY['application/pdf', 'image/png', 'image/jpeg'], 5242880, 'Supplementary evidence')
ON CONFLICT (slot) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    owner_role = EXCLUDED.owner_role,
    required = EXCLUDED.required,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    max_bytes = EXCLUDED.max_bytes,
    regulatory_basis = EXCLUDED.regulatory_basis;

CREATE TABLE IF NOT EXISTS compliance_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  code TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  severity "ComplianceFindingSeverity" NOT NULL,
  status "ComplianceFindingStatus" NOT NULL DEFAULT 'OPEN',
  regulatory_basis TEXT,
  evidence JSONB NOT NULL DEFAULT '{}',
  resolved_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_findings_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_findings_application_id_code_key UNIQUE (application_id, code),
  CONSTRAINT compliance_findings_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS compliance_findings_application_id_status_idx
ON compliance_findings(application_id, status);

CREATE TABLE IF NOT EXISTS application_decision_records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  outcome "ApplicationDecisionOutcome" NOT NULL,
  from_state "ApplicationState" NOT NULL,
  to_state "ApplicationState" NOT NULL,
  justification TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT application_decision_records_pkey PRIMARY KEY (id),
  CONSTRAINT application_decision_records_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT application_decision_records_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS application_decision_records_application_id_created_at_idx
ON application_decision_records(application_id, created_at);

CREATE INDEX IF NOT EXISTS application_decision_records_actor_id_created_at_idx
ON application_decision_records(actor_id, created_at);

CREATE TABLE IF NOT EXISTS information_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  issued_by_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status "InformationLetterStatus" NOT NULL DEFAULT 'ISSUED',
  response_due_at TIMESTAMPTZ(3) NOT NULL,
  issued_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ(3),
  CONSTRAINT information_letters_pkey PRIMARY KEY (id),
  CONSTRAINT information_letters_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT information_letters_issued_by_id_fkey
    FOREIGN KEY (issued_by_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS information_letters_application_id_issued_at_idx
ON information_letters(application_id, issued_at);

CREATE INDEX IF NOT EXISTS information_letters_status_response_due_at_idx
ON information_letters(status, response_due_at);

CREATE TABLE IF NOT EXISTS application_sla_clocks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  state "ApplicationState" NOT NULL,
  started_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TIMESTAMPTZ(3) NOT NULL,
  stopped_at TIMESTAMPTZ(3),
  breached_at TIMESTAMPTZ(3),
  CONSTRAINT application_sla_clocks_pkey PRIMARY KEY (id),
  CONSTRAINT application_sla_clocks_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS application_sla_clocks_application_id_state_idx
ON application_sla_clocks(application_id, state);

CREATE INDEX IF NOT EXISTS application_sla_clocks_due_at_stopped_at_breached_at_idx
ON application_sla_clocks(due_at, stopped_at, breached_at);

CREATE TABLE IF NOT EXISTS application_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  amount_rwf BIGINT NOT NULL,
  status "FeeStatus" NOT NULL DEFAULT 'PENDING',
  proof_document_id UUID,
  submitted_at TIMESTAMPTZ(3),
  verified_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT application_fees_pkey PRIMARY KEY (id),
  CONSTRAINT application_fees_application_id_key UNIQUE (application_id),
  CONSTRAINT application_fees_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT application_fees_proof_document_id_fkey
    FOREIGN KEY (proof_document_id) REFERENCES application_documents(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS application_fees_status_idx
ON application_fees(status);

GRANT USAGE ON TYPE "ShareholderType" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "SeniorManagerRole" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "ComplianceFindingSeverity" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "ComplianceFindingStatus" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "ApplicationDecisionOutcome" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "InformationLetterStatus" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "FeeStatus" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "DocumentSlot" TO licensing_app, licensing_migrate;

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE
  bank_category_thresholds,
  capital_declarations,
  significant_shareholders,
  senior_managers,
  document_slot_specs,
  compliance_findings,
  application_decision_records,
  information_letters,
  application_sla_clocks,
  application_fees
TO licensing_app;

GRANT ALL PRIVILEGES ON TABLE
  bank_category_thresholds,
  capital_declarations,
  significant_shareholders,
  senior_managers,
  document_slot_specs,
  compliance_findings,
  application_decision_records,
  information_letters,
  application_sla_clocks,
  application_fees
TO licensing_migrate;
