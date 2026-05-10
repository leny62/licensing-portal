DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'licensing_app') THEN
    CREATE ROLE licensing_app WITH LOGIN PASSWORD 'licensing_app_change_me';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'licensing_migrate') THEN
    CREATE ROLE licensing_migrate;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO licensing_app', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO licensing_migrate', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO licensing_app;
GRANT USAGE ON SCHEMA public TO licensing_migrate;

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE
  users,
  user_mfa_secrets,
  user_mfa_recovery_codes,
  refresh_tokens,
  applications,
  application_documents,
  notifications
TO licensing_app;

GRANT INSERT, SELECT ON TABLE application_audit TO licensing_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE application_audit FROM licensing_app;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO licensing_migrate;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO licensing_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO licensing_migrate;

CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'application_audit is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS application_audit_no_mutation ON application_audit;

CREATE TRIGGER application_audit_no_mutation
BEFORE UPDATE OR DELETE OR TRUNCATE ON application_audit
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
