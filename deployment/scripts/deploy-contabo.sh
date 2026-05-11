#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deployment/production.env"
ENV_EXAMPLE="$ROOT_DIR/deployment/production.env.example"
COMPOSE_FILE="$ROOT_DIR/deployment/docker-compose.prod.yml"

print_step() {
  printf '\n==> %s\n' "$1"
}

print_info() {
  printf '[ok] %s\n' "$1"
}

print_warn() {
  printf '[warn] %s\n' "$1"
}

fail() {
  printf '[error] %s\n' "$1" >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp

  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { written = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      written = 1
      next
    }
    { print }
    END {
      if (written == 0) {
        print key "=" value
      }
    }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

random_hex() {
  openssl rand -hex 32
}

random_token() {
  openssl rand -base64 48 | tr -d '\n'
}

generate_jwt_keys() {
  local private_key_file
  private_key_file="$(mktemp)"

  openssl genrsa -out "$private_key_file" 4096 >/dev/null 2>&1
  set_env_value JWT_PRIVATE_KEY_BASE64 "$(base64 < "$private_key_file" | tr -d '\n')"
  set_env_value JWT_PUBLIC_KEY_BASE64 "$(openssl rsa -pubout -in "$private_key_file" 2>/dev/null | base64 | tr -d '\n')"

  rm -f "$private_key_file"
}

create_env_file() {
  if [ -f "$ENV_FILE" ]; then
    print_info "production.env already exists"
    return
  fi

  cp "$ENV_EXAMPLE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  set_env_value POSTGRES_PASSWORD "$(random_hex)"
  set_env_value LICENSING_APP_DB_PASSWORD "$(random_hex)"
  set_env_value LICENSING_MIGRATE_DB_PASSWORD "$(random_hex)"
  set_env_value METRICS_BEARER_TOKEN "$(random_token)"
  set_env_value DOCUMENT_KEK_BASE64 "$(openssl rand -base64 32)"
  generate_jwt_keys

  print_warn "Created deployment/production.env with generated secrets."
  print_warn "Edit APP_DOMAIN, CORS_ORIGINS, MAIL_FROM, and SMTP settings before deploying."
  exit 0
}

load_env_file() {
  [ -f "$ENV_FILE" ] || create_env_file

  while IFS='=' read -r key value; do
    case "$key" in
      '' | \#*)
        continue
        ;;
    esac

    export "$key=$value"
  done < "$ENV_FILE"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

require_value() {
  local key="$1"
  local value="${!key:-}"

  [ -n "$value" ] || fail "$key is required in deployment/production.env"
  case "$value" in
    *replace-with-generated-value* | *example.com*)
      fail "$key still has a placeholder value"
      ;;
  esac
}

require_safe_db_password() {
  local key="$1"
  local value="${!key:-}"

  case "$value" in
    *"'"*)
      fail "$key cannot contain a single quote"
      ;;
  esac
}

require_virtual_host_domain() {
  if [ "${NGINX_MODE:-tls}" = "port" ]; then
    return
  fi

  case "$APP_DOMAIN" in
    localhost | 127.* | 10.* | 172.* | 192.168.* | *[!0-9.]*)
      return
      ;;
    *)
      if [ "${ALLOW_IP_HOST:-false}" != "true" ]; then
        fail "APP_DOMAIN must be a DNS hostname so this app does not claim the whole VPS IP. Set a subdomain such as licensing.your-domain.com."
      fi
      ;;
  esac
}

validate_env() {
  require_value APP_DOMAIN
  require_value POSTGRES_PASSWORD
  require_value LICENSING_APP_DB_PASSWORD
  require_value LICENSING_MIGRATE_DB_PASSWORD
  require_value JWT_PRIVATE_KEY_BASE64
  require_value JWT_PUBLIC_KEY_BASE64
  require_value DOCUMENT_KEK_BASE64
  require_value METRICS_BEARER_TOKEN
  require_safe_db_password LICENSING_APP_DB_PASSWORD
  require_safe_db_password LICENSING_MIGRATE_DB_PASSWORD
  require_virtual_host_domain

  if [ "${NODE_ENV:-}" != "production" ]; then
    fail "NODE_ENV must be production"
  fi

  case "${CORS_ORIGINS:-}" in
    "*")
      fail "CORS_ORIGINS cannot be wildcard in production"
      ;;
  esac
}

wait_for_database() {
  local attempt

  for attempt in $(seq 1 30); do
    if compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      print_info "Postgres is ready"
      return
    fi

    sleep 2
  done

  compose logs db
  fail "Postgres did not become ready"
}

harden_database_roles() {
  compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
ALTER ROLE licensing_app WITH LOGIN PASSWORD '${LICENSING_APP_DB_PASSWORD}';
ALTER ROLE licensing_migrate WITH LOGIN PASSWORD '${LICENSING_MIGRATE_DB_PASSWORD}';
SQL
}

render_nginx_template() {
  local template="$1"

  sed \
    -e "s|__APP_DOMAIN__|$APP_DOMAIN|g" \
    -e "s|__PUBLIC_HTTP_PORT__|${PUBLIC_HTTP_PORT:-8091}|g" \
    -e "s|__WEB_BIND_PORT__|${WEB_BIND_PORT:-8080}|g" \
    "$template"
}

open_public_port() {
  local mode="$1"

  if ! command -v ufw >/dev/null 2>&1; then
    return
  fi

  case "$mode" in
    port)
      sudo ufw allow "${PUBLIC_HTTP_PORT:-8091}/tcp"
      ;;
    http)
      sudo ufw allow 80/tcp
      ;;
    tls)
      sudo ufw allow 80/tcp
      sudo ufw allow 443/tcp
      ;;
  esac
}

install_host_nginx() {
  local mode="${NGINX_MODE:-tls}"
  local template="$ROOT_DIR/deployment/nginx/licensing-portal-vps.conf"
  local rendered="/tmp/licensing-portal-nginx.conf"

  if [ "${INSTALL_HOST_NGINX:-false}" != "true" ]; then
    print_warn "Skipping host Nginx install. Set INSTALL_HOST_NGINX=true to install it."
    return
  fi

  if [ "$mode" = "port" ]; then
    template="$ROOT_DIR/deployment/nginx/licensing-portal-port.conf"
    print_warn "Installing public port config on ${PUBLIC_HTTP_PORT:-8091}. Use a domain and TLS for final production."
  elif [ "$mode" = "http" ]; then
    template="$ROOT_DIR/deployment/nginx/licensing-portal-http.conf"
    print_warn "Installing HTTP-only host Nginx config. Use this only before issuing TLS."
  elif [ ! -f "/etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem" ]; then
    fail "TLS certificate not found for $APP_DOMAIN. Issue it first or run with NGINX_MODE=http."
  fi

  render_nginx_template "$template" > "$rendered"

  sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

  if [ -f /etc/nginx/sites-available/licensing-portal ]; then
    sudo cp /etc/nginx/sites-available/licensing-portal \
      "/etc/nginx/sites-available/licensing-portal.backup.$(date +%Y%m%d%H%M%S)"
  fi

  sudo cp "$rendered" /etc/nginx/sites-available/licensing-portal
  sudo ln -sf /etc/nginx/sites-available/licensing-portal /etc/nginx/sites-enabled/licensing-portal

  sudo nginx -t
  open_public_port "$mode"
  sudo systemctl reload nginx
  print_info "Host Nginx config installed"
}

verify_deployment() {
  local web_url="http://127.0.0.1:${WEB_BIND_PORT:-8080}"

  compose ps

  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$web_url" >/dev/null || fail "Web health check failed at $web_url"
    print_info "Web endpoint responded on $web_url"
  else
    print_warn "curl is not installed; skipped web endpoint check"
  fi
}

main() {
  cd "$ROOT_DIR"

  require_command docker
  require_command openssl
  load_env_file
  validate_env

  print_step "Building images"
  compose build migrate api web

  print_step "Starting Postgres"
  compose up -d db
  wait_for_database

  print_step "Applying migrations"
  compose run --rm migrate

  print_step "Hardening database roles"
  harden_database_roles

  print_step "Starting application services"
  compose up -d api web

  print_step "Configuring host Nginx"
  install_host_nginx

  print_step "Verifying deployment"
  verify_deployment

  print_info "Deployment finished"
}

main "$@"
