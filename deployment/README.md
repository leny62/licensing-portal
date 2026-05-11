# Contabo VPS Deployment

Production deployment for the Licensing Portal on a Contabo Ubuntu VM:

- Postgres runs on a private Docker network.
- The API runs as a non-root Node container.
- Migrations run from the same API image before service startup.
- The Angular build is served by a non-root Nginx container.
- Host Nginx routes traffic to the web container over loopback.

Postgres and the API container are not exposed directly. The web container listens on `127.0.0.1:WEB_BIND_PORT`; host Nginx publishes the application on a dedicated public port or routes by hostname.

The default port-based production URLs for this VPS are:

```text
Application: http://194.163.133.79:8091
API:         http://194.163.133.79:8091/api/v1
Health:      http://194.163.133.79:8091/api/v1/healthz
Readiness:   http://194.163.133.79:8091/api/v1/readyz
```

The default ports in `deployment/production.env.example` are:

```env
PUBLIC_HTTP_PORT=8091
WEB_BIND_PORT=18091
```

`PUBLIC_HTTP_PORT` is what users open in the browser. `WEB_BIND_PORT` is only the loopback port used between host Nginx and the web container.

Domain-based deployment uses a dedicated subdomain:

```text
licensing.your-domain.com -> 194.163.133.79
```

## Server bootstrap

Run once on a fresh Ubuntu Contabo VM:

```bash
deployment/scripts/bootstrap-contabo.sh
```

If SSH is not on port 22:

```bash
SSH_PORT=2222 deployment/scripts/bootstrap-contabo.sh
```

Log out and back in after bootstrap so Docker group membership applies.

## First deployment

From the project root on the VPS:

```bash
deployment/scripts/deploy-contabo.sh
```

The first run creates `deployment/production.env`, fills strong local secrets, and exits. Edit these values before running it again:

- `APP_DOMAIN`
- `CORS_ORIGINS`
- `MAIL_FROM`
- SMTP settings

When public port `8091` is already allocated, change `PUBLIC_HTTP_PORT`. When loopback port `18091` is already allocated, change `WEB_BIND_PORT`.

`deployment/production.env` is ignored by git.

## TLS

Point DNS for `APP_DOMAIN` to the Contabo VM before issuing a certificate.

For the current port-based deployment, install the host Nginx port config:

```bash
NGINX_MODE=port INSTALL_HOST_NGINX=true deployment/scripts/deploy-contabo.sh
```

For domain-based deployment, install the HTTP-only host config first:

```bash
NGINX_MODE=http INSTALL_HOST_NGINX=true deployment/scripts/deploy-contabo.sh
```

Issue the certificate:

```bash
sudo certbot --nginx -d your-domain.example
```

Then install the TLS config:

```bash
INSTALL_HOST_NGINX=true deployment/scripts/deploy-contabo.sh
```

The TLS config blocks `/api/v1/metrics` at the public edge. Metrics still require `METRICS_BEARER_TOKEN` inside the API.

## Normal deploy

After pulling new code on the VPS:

```bash
deployment/scripts/deploy-contabo.sh
```

The script builds images, starts Postgres, applies migrations, rotates the database runtime role passwords from `production.env`, starts API/web, and verifies the loopback web endpoint.

## Backups

Run a manual database backup:

```bash
deployment/scripts/backup-postgres.sh
```

Backups are written to `deployment/backups/` with a SHA-256 checksum. Override retention:

```bash
RETENTION_DAYS=30 deployment/scripts/backup-postgres.sh
```

For production, copy backups to storage outside the VM as well.

## Useful commands

```bash
docker compose --env-file deployment/production.env -f deployment/docker-compose.prod.yml ps
docker compose --env-file deployment/production.env -f deployment/docker-compose.prod.yml logs -f api
docker compose --env-file deployment/production.env -f deployment/docker-compose.prod.yml logs -f web
docker compose --env-file deployment/production.env -f deployment/docker-compose.prod.yml logs -f db
```

## Security notes

- Do not expose Postgres or the API container directly to the internet.
- Keep `SWAGGER_ENABLED=false` in production.
- Keep `CORS_ORIGINS` set to the exact public origin.
- Store `deployment/production.env` outside source control and include it in the secure operations backup.
- Run `npm audit` and dependency upgrade work before release.
