#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_SCRIPT="$ROOT_DIR/scripts/run-codex-agent.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/stcc-leaf-loop-runner.sh [--retries N] [--max-cycles N] [--leaf-progress]

Behavior:
  - Runs STCC leaf agents directly in this order per cycle:
    stcc-1 -> stcc-2 -> stcc-3 -> stcc-4 -> stcc-5
  - Enforces STCC loop stop/stall/error logic from stcc-loop.md
  - Prints per-step progress and parsed gate lines
  - Prints final gate line:
    STCC_LOOP_GATE: status=<complete|stall|error> | cycles_run=<n> | consecutive_full_coverage=<n> | last_a1_missing_or_partial_v=<n>

Options:
  --retries N       Retries per leaf agent run via run-codex-agent.sh (default: 5)
  --max-cycles N    Safety cap for full cycles (default: 50)
  --leaf-progress   Pass --progress to each leaf agent invocation
  --help            Show this help
EOF
}

RETRIES=5
MAX_CYCLES=50
LEAF_PROGRESS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retries)
      RETRIES="${2:-}"
      shift 2
      ;;
    --max-cycles)
      MAX_CYCLES="${2:-}"
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
  echo "[stcc-leaf-loop] $*" >&2
}

extract_status() {
  local line="$1"
  sed -n 's/.*status=\([a-zA-Z_]*\).*/\1/p' <<< "$line"
}

extract_num() {
  local line="$1"
  local key="$2"
  sed -n "s/.*${key}=\\([0-9][0-9]*\\).*/\\1/p" <<< "$line"
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

  # Keep only the last non-empty line as the gate.
  awk 'NF {line=$0} END {print line}' "$tmp_out"
  rm -f "$tmp_out"
}

final_gate() {
  local status="$1"
  local cycles_run="$2"
  local consecutive="$3"
  local last_missing="$4"
  echo "STCC_LOOP_GATE: status=${status} | cycles_run=${cycles_run} | consecutive_full_coverage=${consecutive} | last_a1_missing_or_partial_v=${last_missing}"
}

cycle_index=1
cycles_run=0
consecutive_full_coverage=0
stall_counter=0
last_a1_missing_or_partial_v=0

while true; do
  if [[ "$cycles_run" -ge "$MAX_CYCLES" ]]; then
    final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 0
  fi

  log "cycle ${cycle_index}: running stcc-1"
  a1_line="$(run_leaf "stcc-1")" || {
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  }
  log "cycle ${cycle_index}: stcc-1 gate: ${a1_line}"
  if [[ ! "$a1_line" =~ ^STCC_A1_GATE:\ written=docs/spec_to_code_audit.md\ \|\ status= ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  a1_status="$(extract_status "$a1_line")"
  a1_total_v="$(extract_num "$a1_line" "total_v")"
  a1_complete_v="$(extract_num "$a1_line" "complete_v")"
  a1_partial_v="$(extract_num "$a1_line" "partial_v")"
  a1_missing_v="$(extract_num "$a1_line" "missing_v")"
  last_a1_missing_or_partial_v="$(extract_num "$a1_line" "missing_or_partial_v")"
  if [[ -z "$a1_status" || -z "$last_a1_missing_or_partial_v" ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  log "cycle ${cycle_index}: stcc-1 summary: status=${a1_status} total_v=${a1_total_v:-?} complete_v=${a1_complete_v:-?} partial_v=${a1_partial_v:-?} missing_v=${a1_missing_v:-?} missing_or_partial_v=${last_a1_missing_or_partial_v}"
  case "$a1_status" in
    ok) ;;
    stall)
      final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 0
      ;;
    *)
      final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 1
      ;;
  esac

  if [[ "$last_a1_missing_or_partial_v" -eq 0 ]]; then
    consecutive_full_coverage=$((consecutive_full_coverage + 1))
  else
    consecutive_full_coverage=0
  fi

  if [[ "$consecutive_full_coverage" -ge 2 ]]; then
    final_gate "complete" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 0
  fi

  log "cycle ${cycle_index}: running stcc-2"
  a2_line="$(run_leaf "stcc-2")" || {
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  }
  log "cycle ${cycle_index}: stcc-2 gate: ${a2_line}"
  if [[ ! "$a2_line" =~ ^STCC_A2_GATE:\ written=docs/specs_missing.md,docs/specs_incomplete.md\ \|\ status= ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  a2_status="$(extract_status "$a2_line")"
  a2_missing_v="$(extract_num "$a2_line" "missing_v")"
  a2_incomplete_v="$(extract_num "$a2_line" "incomplete_v")"
  a2_missing_written="$(extract_num "$a2_line" "missing_sections_written")"
  a2_incomplete_written="$(extract_num "$a2_line" "incomplete_sections_written")"
  log "cycle ${cycle_index}: stcc-2 summary: status=${a2_status} missing_v=${a2_missing_v:-?} incomplete_v=${a2_incomplete_v:-?} missing_written=${a2_missing_written:-?} incomplete_written=${a2_incomplete_written:-?}"
  case "$a2_status" in
    ok) ;;
    stall)
      final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 0
      ;;
    *)
      final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 1
      ;;
  esac

  log "cycle ${cycle_index}: running stcc-3"
  a3_line="$(run_leaf "stcc-3")" || {
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  }
  log "cycle ${cycle_index}: stcc-3 gate: ${a3_line}"
  if [[ ! "$a3_line" =~ ^STCC_A3_GATE:\ written=docs/code_patches.md\ \|\ status= ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  a3_status="$(extract_status "$a3_line")"
  a3_input_missing="$(extract_num "$a3_line" "input_missing_v")"
  a3_v_added="$(extract_num "$a3_line" "v_added")"
  a3_op_added="$(extract_num "$a3_line" "op_added")"
  a3_blockers_added="$(extract_num "$a3_line" "blockers_added")"
  a3_deferred_added="$(extract_num "$a3_line" "deferred_added")"
  if [[ -z "$a3_v_added" || -z "$a3_op_added" ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  log "cycle ${cycle_index}: stcc-3 summary: status=${a3_status} input_missing_v=${a3_input_missing:-?} v_added=${a3_v_added} op_added=${a3_op_added} blockers_added=${a3_blockers_added:-?} deferred_added=${a3_deferred_added:-?}"
  case "$a3_status" in
    ok) ;;
    stall)
      final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 0
      ;;
    *)
      final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 1
      ;;
  esac

  log "cycle ${cycle_index}: running stcc-4"
  a4_line="$(run_leaf "stcc-4")" || {
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  }
  log "cycle ${cycle_index}: stcc-4 gate: ${a4_line}"
  if [[ ! "$a4_line" =~ ^STCC_A4_GATE:\ written=docs/code_patches.md\ \|\ status= ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  a4_status="$(extract_status "$a4_line")"
  a4_input_incomplete="$(extract_num "$a4_line" "input_incomplete_v")"
  a4_v_replaced="$(extract_num "$a4_line" "v_replaced")"
  a4_missing_in_patchplan="$(extract_num "$a4_line" "v_missing_in_patchplan")"
  a4_op_total="$(extract_num "$a4_line" "op_total_after_replace")"
  a4_blockers_now="$(extract_num "$a4_line" "blockers_now")"
  if [[ -z "$a4_v_replaced" ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  log "cycle ${cycle_index}: stcc-4 summary: status=${a4_status} input_incomplete_v=${a4_input_incomplete:-?} v_replaced=${a4_v_replaced} v_missing_in_patchplan=${a4_missing_in_patchplan:-?} op_total_after_replace=${a4_op_total:-?} blockers_now=${a4_blockers_now:-?}"
  case "$a4_status" in
    ok) ;;
    stall)
      final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 0
      ;;
    *)
      final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 1
      ;;
  esac

  log "cycle ${cycle_index}: running stcc-5"
  a5_line="$(run_leaf "stcc-5")" || {
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  }
  log "cycle ${cycle_index}: stcc-5 gate: ${a5_line}"
  if [[ ! "$a5_line" =~ ^STCC_A5_GATE:\ written=docs/specs_missing.md,docs/specs_incomplete.md\ \|\ status= ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  a5_status="$(extract_status "$a5_line")"
  a5_missing_before="$(extract_num "$a5_line" "missing_before")"
  a5_missing_removed="$(extract_num "$a5_line" "missing_removed")"
  a5_missing_after="$(extract_num "$a5_line" "missing_after")"
  a5_incomplete_before="$(extract_num "$a5_line" "incomplete_before")"
  a5_incomplete_removed="$(extract_num "$a5_line" "incomplete_removed")"
  a5_incomplete_after="$(extract_num "$a5_line" "incomplete_after")"
  if [[ -z "$a5_missing_removed" || -z "$a5_incomplete_removed" ]]; then
    final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 1
  fi
  log "cycle ${cycle_index}: stcc-5 summary: status=${a5_status} missing_before=${a5_missing_before:-?} missing_removed=${a5_missing_removed} missing_after=${a5_missing_after:-?} incomplete_before=${a5_incomplete_before:-?} incomplete_removed=${a5_incomplete_removed} incomplete_after=${a5_incomplete_after:-?}"
  case "$a5_status" in
    ok) ;;
    stall)
      final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 0
      ;;
    *)
      final_gate "error" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
      exit 1
      ;;
  esac

  progress=0
  if [[ "$a3_v_added" -gt 0 || "$a3_op_added" -gt 0 || "$a4_v_replaced" -gt 0 || "$a5_missing_removed" -gt 0 || "$a5_incomplete_removed" -gt 0 ]]; then
    progress=1
  fi

  if [[ "$progress" -eq 0 && "$last_a1_missing_or_partial_v" -gt 0 ]]; then
    stall_counter=$((stall_counter + 1))
  else
    stall_counter=0
  fi

  log "cycle ${cycle_index}: progress=${progress} stall_counter=${stall_counter}"
  if [[ "$stall_counter" -ge 2 ]]; then
    final_gate "stall" "$cycles_run" "$consecutive_full_coverage" "$last_a1_missing_or_partial_v"
    exit 0
  fi

  cycles_run=$((cycles_run + 1))
  cycle_index=$((cycle_index + 1))
done
