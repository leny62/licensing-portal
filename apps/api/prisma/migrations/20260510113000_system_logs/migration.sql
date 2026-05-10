CREATE TYPE "SystemLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

CREATE TABLE "system_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" UUID,
  "user_name" TEXT,
  "level" "SystemLogLevel" NOT NULL,
  "method" TEXT,
  "url" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "request_id" TEXT,
  "exception" TEXT,
  "logger" TEXT,
  "host_address" TEXT,
  "browser" TEXT,
  "server_name" TEXT,
  "code" TEXT,
  "device_id" TEXT,
  "thread" TEXT,
  "business_layer" TEXT,
  "application_name" TEXT NOT NULL DEFAULT 'Licensing Portal API',
  CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_logs_occurred_at_idx" ON "system_logs"("occurred_at");
CREATE INDEX "system_logs_level_occurred_at_idx" ON "system_logs"("level", "occurred_at");
CREATE INDEX "system_logs_user_id_occurred_at_idx" ON "system_logs"("user_id", "occurred_at");

ALTER TABLE "system_logs"
ADD CONSTRAINT "system_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_system_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'system_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_logs_no_mutation
BEFORE UPDATE OR DELETE OR TRUNCATE ON system_logs
FOR EACH STATEMENT EXECUTE FUNCTION reject_system_log_mutation();

GRANT INSERT, SELECT ON TABLE system_logs TO licensing_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE system_logs FROM licensing_app;
GRANT ALL PRIVILEGES ON TABLE system_logs TO licensing_migrate;
