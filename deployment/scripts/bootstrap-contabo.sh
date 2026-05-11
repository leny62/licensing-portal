#!/usr/bin/env bash
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"

print_step() {
  printf '\n==> %s\n' "$1"
}

require_root_tools() {
  command -v sudo >/dev/null 2>&1 || {
    printf 'sudo is required\n' >&2
    exit 1
  }
}

install_packages() {
  sudo apt-get update
  sudo apt-get install -y \
    ca-certificates \
    certbot \
    curl \
    docker-compose-plugin \
    docker.io \
    fail2ban \
    git \
    nginx \
    openssl \
    ufw
}

configure_docker() {
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$DEPLOY_USER"
}

configure_firewall() {
  sudo ufw allow "$SSH_PORT/tcp"
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
}

configure_fail2ban() {
  sudo systemctl enable --now fail2ban
}

main() {
  require_root_tools

  print_step "Installing VPS packages"
  install_packages

  print_step "Enabling Docker"
  configure_docker

  print_step "Configuring firewall"
  configure_firewall

  print_step "Enabling fail2ban"
  configure_fail2ban

  printf '\nBootstrap complete. Log out and back in so Docker group membership is refreshed.\n'
}

main "$@"
