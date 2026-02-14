#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"
exec bash "$ROOT_DIR/scripts/claude/stcc-stage-runner.sh" --retries "${AGENT_RETRIES:-5}" --leaf-progress "$@"
