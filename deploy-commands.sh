#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-oracle-bot}"
REMOTE_DIR="${DEPLOY_DIR:-/home/ubuntu/bot-discord}"

echo "Registering slash commands on '${HOST}:${REMOTE_DIR}'"

# Login shell suele tener el PATH completo (nvm/corepack/npm global).
ssh "${HOST}" "cd '${REMOTE_DIR}' && bash -lc '
  if command -v pnpm >/dev/null 2>&1; then pnpm run deploy;
  elif command -v npm >/dev/null 2>&1; then npm run deploy;
  else echo \"No encontré pnpm ni npm en PATH (probá instalar uno en la VM)\" >&2; exit 127;
  fi
'"

echo "Slash commands registration finished"
