# Licensing Portal

Bank licensing and compliance portal for the National Bank of Rwanda, implementing the requirements of BNR Regulation 2310-13 of 2018. Replaces the manual, email-and-spreadsheet licensing process with an end-to-end workflow that has authenticated roles, a defined state machine, a Rwanda bank-licensing completeness checklist, an append-only audit trail, operational system logs, and versioned document handling.

Monorepo, npm workspaces.

```
apps/api          NestJS + Prisma + PostgreSQL service
apps/web          Angular + Electron client
design-documents  architecture diagrams and design document
```

`packages/api-types` is reserved for generated OpenAPI client types. It is not required by the current API or web build.

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
npm run prisma:seed
npm run api:dev
```

API on `http://localhost:3000/api/v1`. OpenAPI at `http://localhost:3000/api/docs`.

Seed local demo data again whenever you need to reset consumed MFA recovery codes or demo records:

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

The API enforces the regulatory checklist on submit and resubmit. Drafts can be saved while incomplete, but applicants must upload the blocking evidence from the checklist before the application can move forward.

## Web

Start the backend first, then run the Angular frontend:

```bash
npm run web:dev
```

Web app on `http://127.0.0.1:4200`. The Angular dev server proxies `/api` to `http://127.0.0.1:3000`, so keep `npm run api:dev` running in another terminal.

Useful frontend commands:

```bash
npm run web:build
npm run web:test
npm run web:lint
npm run web:e2e
```

Run the Electron desktop shell against the Angular dev server:

```bash
npm run desktop:dev
```

Package the desktop app:

```bash
npm run desktop:package
```

Frontend notes:

- Access tokens are held in memory only.
- Web refresh tokens use `sessionStorage`.
- Electron refresh tokens use the preload `secureStore` bridge.
- Document upload/download is available on application detail pages for authorised roles.
- The application detail page shows the regulatory completeness checklist returned by the API.

## Tests

```bash
npm run prisma:validate
npm run api:test
npm run api:build
npm run web:build
npm run web:test
npm run test
```

Coverage is gated at 90% line and branch on the repo, with 95% line on the high-risk modules (state machine, audit, auth).

## Deployment

Contabo VPS deployment files live in `deployment/`. Production runs Postgres, the API, and the built Angular web app through Docker Compose. Host Nginx publishes the portal on a dedicated port for the shared Contabo VM.

Production endpoints:

```text
Application: http://194.163.133.79:8091
API:         http://194.163.133.79:8091/api/v1
Health:      http://194.163.133.79:8091/api/v1/healthz
Readiness:   http://194.163.133.79:8091/api/v1/readyz
```

The API is not exposed on a separate public port; it is routed under `/api/v1` through the same application port.

```bash
deployment/scripts/bootstrap-contabo.sh
NGINX_MODE=port INSTALL_HOST_NGINX=true deployment/scripts/deploy-contabo.sh
```

The first deploy command creates `deployment/production.env` with generated secrets and exits. Review the port, CORS origin, and mail settings before running it again. See `deployment/README.md` for TLS, backups, and operations commands.

## Audit and logs

- Application audit is legal-evidence oriented: create draft, update draft, document upload, and every workflow transition are written to the append-only `application_audit` chain.
- The audit chain is protected by database grants, a mutation-blocking trigger, and hash chaining.
- System logs are operational telemetry for administrators: request outcome, user, URL, request ID, logger, host address, browser, server name, code, device ID, process/thread, business layer, and application name.
- System logs are searchable, filterable, exportable as CSV, and append-only at database role level, but they do not replace the application audit chain.
- If `/api/v1/system-logs` reports a migration-required error, run `npm run prisma:migrate`.

## Health and observability

`GET /api/v1/healthz` returns liveness and database readiness. Prometheus-compatible metrics are exposed at `/api/v1/metrics` and require the configured bearer token in production.
