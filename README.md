# Licensing Portal

Bank licensing and compliance portal for the National Bank of Rwanda. Replaces the manual, email-and-spreadsheet licensing process with an end-to-end workflow that has authenticated roles, a defined state machine, an append-only audit trail, and versioned document handling.

Monorepo, npm workspaces.

```
apps/api          NestJS + Prisma + PostgreSQL service
apps/web          Angular + Electron client
packages/api-types  shared types generated from the API's OpenAPI document
```

## Prerequisites

- Node 20 LTS
- npm 10+
- PostgreSQL 16 for local development. PostgreSQL 14 works for basic local smoke testing, but 16 is the target runtime.
- Docker for integration tests that use Testcontainers.

## API

All commands below are run from the monorepo root.

```bash
npm install
cp apps/api/.env.example apps/api/.env
```

Generate local development secrets:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/licensing-jwt-private.pem
openssl rsa -pubout -in /tmp/licensing-jwt-private.pem -out /tmp/licensing-jwt-public.pem

JWT_PRIVATE_KEY_BASE64=$(openssl base64 -A -in /tmp/licensing-jwt-private.pem)
JWT_PUBLIC_KEY_BASE64=$(openssl base64 -A -in /tmp/licensing-jwt-public.pem)
DOCUMENT_KEK_BASE64=$(openssl rand -base64 32)

printf '%s\n' "$JWT_PRIVATE_KEY_BASE64"
printf '%s\n' "$JWT_PUBLIC_KEY_BASE64"
printf '%s\n' "$DOCUMENT_KEK_BASE64"
```

Paste those values into `apps/api/.env`:

```env
JWT_PRIVATE_KEY_BASE64=<base64 private key>
JWT_PUBLIC_KEY_BASE64=<base64 public key>
DOCUMENT_KEK_BASE64=<base64 32-byte key>
```

Copy only the base64 text.

Use the local database URL:

```env
DATABASE_URL=postgresql://licensing:licensing@localhost:5432/licensing_portal?schema=public
```

Run Prisma and start the API:

```bash
npm run prisma:migrate
npm run prisma:generate
npm run api:dev
```

API on `http://localhost:3000/api/v1`. OpenAPI at `http://localhost:3000/api/docs`.

Seed local demo data:

```bash
npm run prisma:seed
```

The seed is idempotent and creates one user per role:

```text
applicant@licensing.local
reviewer@licensing.local
approver@licensing.local
admin@licensing.local
```

The default password is `LocalPass123!`. Reviewer, approver, and admin logins require MFA; use the seeded recovery code `LOCAL-RECOVERY-0001`. Run `npm run prisma:seed` again to reset consumed recovery codes.

## Tests

```bash
npm run api:test
```

Coverage is gated at 90% line and branch on the repo, with 95% line on the high-risk modules (state machine, audit, auth).

## Operator scripts

- `npm run verify:audit-chain --workspace api` — recompute every audit entry hash and report divergences.
- `npm run rotate:jwt-key --workspace api` — provision the next JWT signing key and advance the active kid.
- `npm run rotate:kek --workspace api` — re-wrap every document DEK under a new KEK.
- `npm run revoke:refresh-tokens --workspace api` — revoke a single user's tokens or the whole table.

## Health and observability

`GET /healthz` returns liveness and database readiness. Prometheus-compatible metrics are exposed at `/metrics`.
