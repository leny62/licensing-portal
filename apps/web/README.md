# Bank Licensing Portal Web

Angular 18 PWA and Electron shell for the Bank Licensing and Compliance Portal.

## Run Locally

From the monorepo root:

```bash
npm install
npm run api:dev
npm run web:dev
```

The web app runs at `http://127.0.0.1:4200` and proxies `/api` to the backend on `http://127.0.0.1:3000`.

Seeded users use password `LocalPass123!`. Reviewer, approver, and admin accounts require MFA; use recovery code `LOCAL-RECOVERY-0001` after running `npm run prisma:seed`.

## Token Storage

The web build stores access tokens in memory only. Refresh tokens are held in `sessionStorage`, so closing the tab requires a new login. The Electron build stores refresh tokens through the preload `secureStore` bridge backed by Electron `safeStorage`.

## Useful Commands

```bash
npm run web:dev
npm run web:build
npm run web:test
npm run web:lint
npm run web:e2e
npm run desktop:dev
npm run desktop:package
```
