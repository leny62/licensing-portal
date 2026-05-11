#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deployment/production.env"
COMPOSE_FILE="$ROOT_DIR/deployment/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/deployment/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

[ -f "$ENV_FILE" ] || {
  printf 'deployment/production.env is required\n' >&2
  exit 1
}

while IFS='=' read -r key value; do
  case "$key" in
    '' | \#*)
      continue
      ;;
  esac

  export "$key=$value"
done < "$ENV_FILE"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/licensing-portal-$timestamp.dump"

compose exec -T db pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --no-owner \
  --no-acl > "$backup_file"

sha256sum "$backup_file" > "$backup_file.sha256"
find "$BACKUP_DIR" -type f -name 'licensing-portal-*.dump*' -mtime +"$RETENTION_DAYS" -delete

printf 'Backup written to %s\n' "$backup_file"
