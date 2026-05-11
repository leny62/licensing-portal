-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('GRANT', 'GRANT_WITH_CONDITIONS', 'GRANT_LIMITED', 'REFUSE');

-- DropIndex
DROP INDEX "applications_application_kind_idx";

-- DropIndex
DROP INDEX "applications_bank_category_idx";

-- AlterTable
ALTER TABLE "application_audit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "application_decision_records" ADD COLUMN     "allowed_activities" TEXT,
ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "decision_type" "DecisionType",
ADD COLUMN     "refusal_reasons" JSONB,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "application_documents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "application_fees" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "application_sla_clocks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bank_category_thresholds" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "capital_declarations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "compliance_findings" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_slot_specs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "information_letters" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "senior_managers" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "significant_shareholders" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_mfa_recovery_codes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

GRANT USAGE ON TYPE "DecisionType" TO licensing_app, licensing_migrate;
