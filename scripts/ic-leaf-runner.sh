#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_SCRIPT="$ROOT_DIR/scripts/run-codex-agent.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ic-leaf-runner.sh [--retries N] [--leaf-progress]

Behavior:
  - Runs IC leaf pipeline:
    ic-0 -> ic-1 -> ic-2 -> ic-3 -> ic-4 -> ic-5 -> ic-housekeeping -> ic-lfg
  - Emits IC-XL compatible final output:
    success block with ROLLOVER + SIGNOFF: IC-XL
    or STOP block with SIGNOFF: IC-XL
EOF
}

RETRIES=5
LEAF_PROGRESS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retries)
      RETRIES="${2:-}"
      shift 2
      ;;
    --leaf-progress)
      LEAF_PROGRESS=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -x "$RUNNER_SCRIPT" ]]; then
  echo "Runner script missing or not executable: $RUNNER_SCRIPT" >&2
  exit 2
fi

log() {
  echo "[ic-leaf] $*" >&2
}

run_leaf() {
  local agent="$1"
  local tmp_out
  tmp_out="$(mktemp)"

  if [[ "$LEAF_PROGRESS" -eq 1 ]]; then
    if ! bash "$RUNNER_SCRIPT" --progress --retries "$RETRIES" "$agent" >"$tmp_out"; then
      rm -f "$tmp_out"
      return 1
    fi
  else
    if ! bash "$RUNNER_SCRIPT" --retries "$RETRIES" "$agent" >"$tmp_out"; then
      rm -f "$tmp_out"
      return 1
    fi
  fi

  cat "$tmp_out"
  rm -f "$tmp_out"
}

emit_stop() {
  local reason="$1"
  local step="$2"
  echo "IC-XL: STOP"
  echo "REASON: ${reason}"
  echo "FAILED_STEP: ${step}"
  echo "SIGNOFF: IC-XL"
}

emit_blocked_stop() {
  local questions="$1"
  echo "IC-XL: STOP"
  echo "REASON: BLOCKED"
  echo "QUESTIONS:"
  if [[ -n "$questions" ]]; then
    echo "$questions"
  else
    echo "- No explicit questions provided by IC-LFG"
  fi
  echo "SIGNOFF: IC-XL"
}

require_file_nonempty() {
  local file="$1"
  [[ -s "$file" ]]
}

if [[ ! -s "$ROOT_DIR/docs/code_patches_confirmed.md" || ! -s "$ROOT_DIR/docs/spec_review.md" || ! -s "$ROOT_DIR/docs/brief.md" ]]; then
  emit_stop "Missing required preflight file(s)" "PREFLIGHT"
  exit 1
fi

log "running ic-0"
ic0_out="$(run_leaf "ic-0")" || { emit_stop "Agent execution failed" "IC-0"; exit 1; }
if ! echo "$ic0_out" | grep -q '^SIGNOFF: IC-0$'; then emit_stop "Missing SIGNOFF: IC-0" "IC-0"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_implementation.md"; then emit_stop "Missing docs/code_implementation.md" "IC-0"; exit 1; fi

log "running ic-1"
ic1_out="$(run_leaf "ic-1")" || { emit_stop "Agent execution failed" "IC-1"; exit 1; }
if ! echo "$ic1_out" | grep -q '^SIGNOFF: IC-1$'; then emit_stop "Missing SIGNOFF: IC-1" "IC-1"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_implementation_checksum.md"; then emit_stop "Missing docs/code_implementation_checksum.md" "IC-1"; exit 1; fi

log "running ic-2"
ic2_out="$(run_leaf "ic-2")" || { emit_stop "Agent execution failed" "IC-2"; exit 1; }
if ! echo "$ic2_out" | grep -q '^SIGNOFF: IC-2$'; then emit_stop "Missing SIGNOFF: IC-2" "IC-2"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_implementation_verification.md"; then emit_stop "Missing docs/code_implementation_verification.md" "IC-2"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_implementation_checksum.md"; then emit_stop "Missing docs/code_implementation_checksum.md after ic-2" "IC-2"; exit 1; fi

log "running ic-3"
ic3_out="$(run_leaf "ic-3")" || { emit_stop "Agent execution failed" "IC-3"; exit 1; }
if ! echo "$ic3_out" | grep -q '^SIGNOFF: IC-3$'; then emit_stop "Missing SIGNOFF: IC-3" "IC-3"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_patches_confirmed2.md"; then emit_stop "Missing docs/code_patches_confirmed2.md" "IC-3"; exit 1; fi

log "running ic-4"
ic4_out="$(run_leaf "ic-4")" || { emit_stop "Agent execution failed" "IC-4"; exit 1; }
if ! echo "$ic4_out" | grep -q '^SIGNOFF: IC-4$'; then emit_stop "Missing SIGNOFF: IC-4" "IC-4"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/code_implementation2.md"; then emit_stop "Missing docs/code_implementation2.md" "IC-4"; exit 1; fi

log "running ic-5"
ic5_out="$(run_leaf "ic-5")" || { emit_stop "Agent execution failed" "IC-5"; exit 1; }
if ! echo "$ic5_out" | grep -q '^SIGNOFF: IC-5$'; then emit_stop "Missing SIGNOFF: IC-5" "IC-5"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/verifier.md"; then emit_stop "Missing docs/verifier.md" "IC-5"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/brief-missing.md"; then emit_stop "Missing docs/brief-missing.md" "IC-5"; exit 1; fi

log "running ic-housekeeping"
ich_out="$(run_leaf "ic-housekeeping")" || { emit_stop "Agent execution failed" "IC-HOUSEKEEPING"; exit 1; }
if ! echo "$ich_out" | grep -q '^SIGNOFF: IC-HOUSEKEEPING$'; then emit_stop "Missing SIGNOFF: IC-HOUSEKEEPING" "IC-HOUSEKEEPING"; exit 1; fi
if ! require_file_nonempty "$ROOT_DIR/docs/housekeeping.md"; then emit_stop "Missing docs/housekeeping.md" "IC-HOUSEKEEPING"; exit 1; fi

log "running ic-lfg"
iclfg_out="$(run_leaf "ic-lfg")" || { emit_stop "Agent execution failed" "IC-LFG"; exit 1; }
if ! echo "$iclfg_out" | grep -q '^SIGNOFF: IC-LFG$'; then emit_stop "Missing SIGNOFF: IC-LFG" "IC-LFG"; exit 1; fi

if echo "$iclfg_out" | grep -Eq '^BLOCKED: [1-9][0-9]*$|STOPPED BEFORE CLEANUP\.$'; then
  questions="$(echo "$iclfg_out" | awk '
    /^QUESTIONS:$/ {capture=1; next}
    /^STOPPED BEFORE CLEANUP\.$/ {capture=0}
    /^SIGNOFF: IC-LFG$/ {capture=0}
    capture && /^- / {print}
  ')"
  emit_blocked_stop "$questions"
  exit 0
fi

rollover_line="$(echo "$iclfg_out" | grep -E '^ROLLOVER: (YES|NO)$' | tail -n1 || true)"
if [[ -z "$rollover_line" ]]; then
  emit_stop "Missing ROLLOVER signal" "IC-LFG"
  exit 1
fi
rollover="${rollover_line#ROLLOVER: }"

if [[ "$rollover" == "YES" && ! -f "$ROOT_DIR/docs/brief.md" ]]; then
  emit_stop "ROLLOVER YES but docs/brief.md missing" "IC-LFG"
  exit 1
fi

echo "IC-0: OK"
echo "IC-1: OK"
echo "IC-2: OK"
echo "IC-3: OK"
echo "IC-4: OK"
echo "IC-5: OK"
echo "IC-HOUSEKEEPING: OK"
echo "IC-LFG: OK"
echo "Finished one IC iteration + housekeeping + cleanup."
echo "ROLLOVER: ${rollover}"
echo "SIGNOFF: IC-XL"

