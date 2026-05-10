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
- Docker (for the local Postgres instance and the integration test database)

## API

```bash
cd apps/api
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

API on `http://localhost:3000`. OpenAPI at `/api/docs`.

From the monorepo root:

```bash
npm install
npm run api:migrate
npm run api:seed
npm run api:dev
```

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
