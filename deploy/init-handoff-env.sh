#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -e .env ]; then
  printf '%s\n' 'Existing .env preserved. This initializer is for a NEW installation only.' >&2
  exit 1
fi
command -v openssl >/dev/null
read -r -s -p 'New administrator password (at least 10 characters): ' admin_password
printf '\n'
if [ "${#admin_password}" -lt 10 ]; then
  printf '%s\n' 'Password must have at least 10 characters.' >&2
  exit 1
fi
read -r -s -p 'Repeat administrator password: ' admin_confirmation
printf '\n'
[ "$admin_password" = "$admin_confirmation" ] || { printf '%s\n' 'Passwords do not match.' >&2; exit 1; }
umask 077
set -o noclobber
{
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'ADMIN_PASSWORD_SHA256=%s\n' "$(printf '%s' "$admin_password" | openssl dgst -sha256 -r | cut -d ' ' -f 1)"
  printf 'COOKIE_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'COOKIE_SECURE=false\nWEB_BIND=127.0.0.1\nWEB_PORT=8397\n'
} > .env
unset admin_password admin_confirmation
printf '%s\n' 'Created private .env for a NEW installation. Use HTTPS and COOKIE_SECURE=true before public use.'
