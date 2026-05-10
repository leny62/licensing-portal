CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserRole" AS ENUM (
  'APPLICANT',
  'REVIEWER',
  'APPROVER',
  'ADMIN'
);

CREATE TYPE "ApplicationState" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'RECOMMENDED_FOR_APPROVAL',
  'RECOMMENDED_FOR_REJECTION',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE "NotificationType" AS ENUM (
  'REQUEST_INFO',
  'FINAL_DECISION',
  'RECOMMENDATION_READY'
);

CREATE SEQUENCE application_reference_seq START 1;

CREATE OR REPLACE FUNCTION next_application_reference()
RETURNS text AS $$
  SELECT
    'APP-' ||
    to_char(CURRENT_DATE, 'YYYYMMDD') ||
    '-' ||
    lpad(nextval('application_reference_seq')::text, 6, '0');
$$ LANGUAGE sql;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role "UserRole" NOT NULL,
  institution_name text,
  is_active boolean NOT NULL DEFAULT true,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE user_mfa_secrets (
  user_id uuid PRIMARY KEY,
  secret_encrypted bytea NOT NULL,
  enrolled_at timestamptz(3) NOT NULL DEFAULT now(),
  last_used_at timestamptz(3),
  CONSTRAINT user_mfa_secrets_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE TABLE user_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT user_mfa_recovery_codes_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT user_mfa_recovery_codes_user_id_code_hash_key
    UNIQUE (user_id, code_hash)
);

CREATE INDEX user_mfa_recovery_codes_user_id_idx
  ON user_mfa_recovery_codes(user_id);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL,
  device_id text NOT NULL,
  revoked_at timestamptz(3),
  revoke_reason text,
  expires_at timestamptz(3) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX refresh_tokens_user_id_idx
  ON refresh_tokens(user_id);

CREATE INDEX refresh_tokens_family_id_idx
  ON refresh_tokens(family_id);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE DEFAULT next_application_reference(),
  applicant_id uuid NOT NULL,
  institution_name text NOT NULL,
  legal_form text NOT NULL,
  country text NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  summary text NOT NULL,
  state "ApplicationState" NOT NULL DEFAULT 'DRAFT',
  row_version integer NOT NULL DEFAULT 0,
  reviewer_id uuid,
  approver_id uuid,
  submitted_at timestamptz(3),
  last_resubmit_at timestamptz(3),
  decided_at timestamptz(3),
  justification text,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT applications_applicant_id_fkey
    FOREIGN KEY (applicant_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT applications_reviewer_id_fkey
    FOREIGN KEY (reviewer_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT applications_approver_id_fkey
    FOREIGN KEY (approver_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX applications_applicant_id_idx
  ON applications(applicant_id);

CREATE INDEX applications_state_idx
  ON applications(state);

CREATE INDEX applications_reviewer_id_idx
  ON applications(reviewer_id);

CREATE TABLE application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  slot text NOT NULL,
  version integer NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  wrapped_dek bytea NOT NULL,
  iv bytea NOT NULL,
  auth_tag bytea NOT NULL,
  uploader_id uuid,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT application_documents_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT application_documents_uploader_id_fkey
    FOREIGN KEY (uploader_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT application_documents_application_id_slot_version_key
    UNIQUE (application_id, slot, version)
);

CREATE INDEX application_documents_application_id_idx
  ON application_documents(application_id);

CREATE TABLE application_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  from_state "ApplicationState",
  to_state "ApplicationState",
  justification text,
  source_ip text,
  correlation_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text,
  entry_hash text NOT NULL UNIQUE,
  occurred_at timestamptz(3) NOT NULL DEFAULT now(),
  clock_offset_ms integer NOT NULL DEFAULT 0,
  CONSTRAINT application_audit_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT application_audit_actor_id_fkey
    FOREIGN KEY (actor_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX application_audit_application_id_occurred_at_idx
  ON application_audit(application_id, occurred_at);

CREATE INDEX application_audit_actor_id_idx
  ON application_audit(actor_id);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid,
  type "NotificationType" NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT notifications_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX notifications_user_id_idx
  ON notifications(user_id);

CREATE INDEX notifications_application_id_idx
  ON notifications(application_id);
