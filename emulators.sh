#!/usr/bin/env zsh
# Launch Firebase emulators with macOS fork-safety disabled.
# This must be set in the shell BEFORE firebase/gunicorn forks any process.
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
export GEMINI_API_KEY=REDACTED

cd "$(dirname "$0")"
exec firebase emulators:start "$@"
