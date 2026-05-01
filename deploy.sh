#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-oracle-bot}"
REMOTE_DIR="${DEPLOY_DIR:-/home/ubuntu/bot-discord}"
PROCESS_NAME="${DEPLOY_PROCESS:-bot-discord}"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "Deploying branch '${BRANCH}' to '${HOST}:${REMOTE_DIR}' (pm2: ${PROCESS_NAME})"

ssh "${HOST}" "cd '${REMOTE_DIR}' && git fetch origin '${BRANCH}' && git checkout '${BRANCH}' && git pull --ff-only origin '${BRANCH}' && pm2 restart '${PROCESS_NAME}'"

echo "Deploy finished"
