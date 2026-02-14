#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage:
  scripts/masteragent-runner.sh [--retries N] [--leaf-progress] [--verbose]

Behavior:
  - Runs full master pipeline using stage leaf runners:
    NB stage -> BTS stage -> STCC stage -> IC stage
  - Enforces bootstrap + rollover loop rules
  - Emits final:
    MASTER_GATE: status=<DONE|STOP|STALL|ERROR> iterations=<n> last_stage=<NB|BTS|STCC|IC> rollover=<YES|NO|NA>

Options:
  --retries N      Retries per leaf-agent invocation (default: 5)
  --leaf-progress  Pass --leaf-progress to stage runners
  --verbose        Print full stage output logs to stderr
  --help           Show help

Environment overrides:
  CMD_NB_STAGE
  CMD_BTS_STAGE
  CMD_STCC_STAGE
  CMD_IC_STAGE
EOF
}

RETRIES=5
LEAF_PROGRESS=0
VERBOSE=0

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
    --verbose)
      VERBOSE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

leaf_progress_flag=""
if [[ "$LEAF_PROGRESS" -eq 1 ]]; then
  leaf_progress_flag="--leaf-progress"
fi

: "${CMD_NB_STAGE:=bash scripts/nb-leaf-runner.sh --retries ${RETRIES} ${leaf_progress_flag}}"
: "${CMD_BTS_STAGE:=bash scripts/bts-leaf-runner.sh --retries ${RETRIES} ${leaf_progress_flag}}"
: "${CMD_STCC_STAGE:=bash scripts/stcc-stage-runner.sh --retries ${RETRIES} ${leaf_progress_flag}}"
: "${CMD_IC_STAGE:=bash scripts/ic-leaf-runner.sh --retries ${RETRIES} ${leaf_progress_flag}}"

LOG_DIR="${LOG_DIR:-.tmp/masteragent}"
mkdir -p "$LOG_DIR"

LAST_OUTPUT=""
LAST_LOG_FILE=""
LAST_RC=0

debug() {
  echo "[master] $*" >&2
}

run_and_capture() {
  local stage="$1"
  local cmd="$2"
  local log_file="$LOG_DIR/${stage}_$(date +%Y%m%d_%H%M%S)_$$.log"
  LAST_LOG_FILE="$log_file"

  debug "running stage command: $stage"
  set +e
  bash -lc "$cmd" >"$log_file" 2>&1
  LAST_RC=$?
  set -e

  LAST_OUTPUT="$(cat "$log_file")"
  if [[ "$VERBOSE" -eq 1 ]]; then
    echo "----- ${stage} output -----" >&2
    cat "$log_file" >&2
    echo "----- end ${stage} -----" >&2
  fi
}

count_v_sections() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo 0
    return
  fi
  grep -E -c '^## V-' "$file" || true
}

extract_line() {
  local pattern="$1"
  echo "$LAST_OUTPUT" | grep -E "$pattern" | tail -n1 || true
}

extract_status_upper() {
  local line="$1"
  echo "$line" | sed -E 's/.*status=([A-Z_]+).*/\1/'
}

final_gate() {
  local status="$1"
  local iterations="$2"
  local last_stage="$3"
  local rollover="$4"
  echo "MASTER_GATE: status=${status} iterations=${iterations} last_stage=${last_stage} rollover=${rollover}"
}

bootstrap_done=false
brief_file="docs/brief.md"
iterations=0
last_rollover="NA"
last_stage="NB"
expect_rollover_brief=false

if [[ -f "$brief_file" ]] && [[ "$(count_v_sections "$brief_file")" -gt 0 ]]; then
  bootstrap_done=true
fi

while true; do
  if [[ -f "$brief_file" ]]; then
    v_count="$(count_v_sections "$brief_file")"
    if [[ "$v_count" -eq 0 ]]; then
      final_gate "DONE" "$iterations" "$last_stage" "$last_rollover"
      exit 0
    fi
  else
    if [[ "$bootstrap_done" == "true" ]]; then
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
    fi
  fi

  if [[ "$bootstrap_done" == "false" ]]; then
    last_stage="NB"
    run_and_capture "nb-stage" "$CMD_NB_STAGE"
    nb_status_line="$(extract_line '^NB::nb-loop::STATUS::')"
    if [[ -z "$nb_status_line" ]]; then
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
    fi
    nb_status="${nb_status_line##*::}"
    case "$nb_status" in
      OK)
        bootstrap_done=true
        ;;
      STOP)
        final_gate "STOP" "$iterations" "$last_stage" "$last_rollover"
        exit 0
        ;;
      FAIL)
        final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
        exit 1
        ;;
      *)
        final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
        exit 1
        ;;
    esac
  fi

  last_stage="BTS"
  run_and_capture "bts-stage" "$CMD_BTS_STAGE"
  bts_gate="$(extract_line '^BTS_FULL_GATE: status=')"
  if [[ -z "$bts_gate" ]]; then
    final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
    exit 1
  fi
  bts_status="$(extract_status_upper "$bts_gate")"
  case "$bts_status" in
    DONE) ;;
    OPEN_QUESTIONS)
      final_gate "STOP" "$iterations" "$last_stage" "$last_rollover"
      exit 0
      ;;
    STALL)
      final_gate "STALL" "$iterations" "$last_stage" "$last_rollover"
      exit 0
      ;;
    ERROR|*)
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
      ;;
  esac

  last_stage="STCC"
  run_and_capture "stcc-stage" "$CMD_STCC_STAGE"
  stcc_gate="$(extract_line '^STCC_XL_GATE: status=')"
  if [[ -z "$stcc_gate" ]]; then
    final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
    exit 1
  fi
  stcc_status="$(extract_status_upper "$stcc_gate")"
  case "$stcc_status" in
    DONE) ;;
    STALL)
      final_gate "STALL" "$iterations" "$last_stage" "$last_rollover"
      exit 0
      ;;
    ERROR|*)
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
      ;;
  esac

  last_stage="IC"
  run_and_capture "ic-stage" "$CMD_IC_STAGE"

  if echo "$LAST_OUTPUT" | grep -q '^IC-XL: STOP$'; then
    final_gate "STOP" "$iterations" "$last_stage" "$last_rollover"
    exit 0
  fi

  if ! echo "$LAST_OUTPUT" | grep -q '^SIGNOFF: IC-XL$'; then
    final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
    exit 1
  fi

  rollover_line="$(extract_line '^ROLLOVER: (YES|NO)$')"
  if [[ -z "$rollover_line" ]]; then
    final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
    exit 1
  fi
  last_rollover="${rollover_line#ROLLOVER: }"
  iterations=$((iterations + 1))

  if [[ "$last_rollover" == "YES" ]]; then
    expect_rollover_brief=true
    if [[ ! -f "$brief_file" ]]; then
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
    fi
    if [[ "$(count_v_sections "$brief_file")" -eq 0 ]]; then
      final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
      exit 1
    fi
    continue
  fi

  if [[ "$last_rollover" == "NO" ]]; then
    final_gate "DONE" "$iterations" "$last_stage" "$last_rollover"
    exit 0
  fi

  final_gate "ERROR" "$iterations" "$last_stage" "$last_rollover"
  exit 1
done

