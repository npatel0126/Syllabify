#!/usr/bin/env zsh
# Launch Firebase emulators with macOS fork-safety disabled.
# This must be set in the shell BEFORE firebase/gunicorn forks any process.
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
# Load secrets from .env.local if present (gitignored — never committed)
if [ -f "$(dirname "$0")/.env.local" ]; then
  set -a
  source "$(dirname "$0")/.env.local"
  set +a
fi

cd "$(dirname "$0")"
exec firebase emulators:start "$@"
