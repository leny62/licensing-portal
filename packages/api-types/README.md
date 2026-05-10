# @licensing-portal/api-types

Types generated from the API's OpenAPI specification. Consumed by `apps/web`.

The generator runs `openapi-typescript` against the API's `/api/docs/openapi.json` and writes a single `dist/index.d.ts`. The web app imports these types so that any change to a request or response shape on the API breaks the web build, not production.

## Generate

```bash
# from the monorepo root, with the API running on http://localhost:3000:
npm run types:generate
```
