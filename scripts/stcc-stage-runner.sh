#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_SCRIPT="$ROOT_DIR/scripts/run-codex-agent.sh"
STCC_LEAF_LOOP="$ROOT_DIR/scripts/stcc-leaf-loop-runner.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/stcc-stage-runner.sh [--retries N] [--leaf-progress]

Behavior:
  - Runs STCC full stage with partial leaf visibility:
    stcc-0
    stcc-leaf-loop-runner (loop #1)
    stcc-leaf-loop-runner (loop #2 stability rerun)
    stcc-loop2
  - Emits:
    STCC_XL_GATE: status=<DONE|STALL|ERROR> | stcc0=<ok|error> | loop1=<complete|stall|error> | loop2=<complete|stall|error> | loop2safety=<DONE|STALL>
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

if [[ ! -x "$RUNNER_SCRIPT" || ! -x "$STCC_LEAF_LOOP" ]]; then
  echo "Required runner missing/not executable." >&2
  exit 2
fi

log() {
  echo "[stcc-stage] $*" >&2
}

run_agent_capture() {
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

run_stcc_leaf_loop() {
  local tmp_out
  tmp_out="$(mktemp)"
  if [[ "$LEAF_PROGRESS" -eq 1 ]]; then
    if ! bash "$STCC_LEAF_LOOP" --retries "$RETRIES" --leaf-progress >"$tmp_out"; then
      rm -f "$tmp_out"
      return 1
    fi
  else
    if ! bash "$STCC_LEAF_LOOP" --retries "$RETRIES" >"$tmp_out"; then
      rm -f "$tmp_out"
      return 1
    fi
  fi
  cat "$tmp_out"
  rm -f "$tmp_out"
}

extract_loop_status() {
  local line="$1"
  sed -n 's/.*status=\([a-z]*\).*/\1/p' <<< "$line"
}

stcc0="error"
loop1="error"
loop2="error"
loop2safety="STALL"
status="ERROR"

log "running stcc-0"
stcc0_out="$(run_agent_capture "stcc-0")" || {
  echo "STCC_XL_GATE: status=ERROR | stcc0=error | loop1=error | loop2=error | loop2safety=STALL"
  exit 1
}
stcc0_gate="$(echo "$stcc0_out" | grep -E '^STCC_0_GATE: ' | tail -n1 || true)"
if [[ -z "$stcc0_gate" || ! "$stcc0_gate" =~ status=ok ]]; then
  echo "STCC_XL_GATE: status=ERROR | stcc0=error | loop1=error | loop2=error | loop2safety=STALL"
  exit 1
fi
log "stcc-0 gate: ${stcc0_gate}"
stcc0="ok"

log "running stcc coverage loop #1"
loop1_out="$(run_stcc_leaf_loop)" || {
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=error | loop2=error | loop2safety=STALL"
  exit 1
}
loop1_gate="$(echo "$loop1_out" | grep -E '^STCC_LOOP_GATE: ' | tail -n1 || true)"
if [[ -z "$loop1_gate" ]]; then
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=error | loop2=error | loop2safety=STALL"
  exit 1
fi
log "loop #1 gate: ${loop1_gate}"
loop1="$(extract_loop_status "$loop1_gate")"
if [[ "$loop1" != "complete" ]]; then
  if [[ "$loop1" == "stall" ]]; then
    echo "STCC_XL_GATE: status=STALL | stcc0=${stcc0} | loop1=stall | loop2=error | loop2safety=STALL"
    exit 0
  fi
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=error | loop2=error | loop2safety=STALL"
  exit 1
fi

log "running stcc coverage loop #2"
loop2_out="$(run_stcc_leaf_loop)" || {
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=${loop1} | loop2=error | loop2safety=STALL"
  exit 1
}
loop2_gate="$(echo "$loop2_out" | grep -E '^STCC_LOOP_GATE: ' | tail -n1 || true)"
if [[ -z "$loop2_gate" ]]; then
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=${loop1} | loop2=error | loop2safety=STALL"
  exit 1
fi
log "loop #2 gate: ${loop2_gate}"
loop2="$(extract_loop_status "$loop2_gate")"
if [[ "$loop2" != "complete" ]]; then
  if [[ "$loop2" == "stall" ]]; then
    echo "STCC_XL_GATE: status=STALL | stcc0=${stcc0} | loop1=${loop1} | loop2=stall | loop2safety=STALL"
    exit 0
  fi
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=${loop1} | loop2=error | loop2safety=STALL"
  exit 1
fi

log "running stcc-loop2 safety"
loop2s_out="$(run_agent_capture "stcc-loop2")" || {
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=${loop1} | loop2=${loop2} | loop2safety=STALL"
  exit 1
}
loop2s_gate="$(echo "$loop2s_out" | grep -E '^STCC_LOOP2_GATE: ' | tail -n1 || true)"
if [[ -z "$loop2s_gate" ]]; then
  echo "STCC_XL_GATE: status=ERROR | stcc0=${stcc0} | loop1=${loop1} | loop2=${loop2} | loop2safety=STALL"
  exit 1
fi
log "loop2 safety gate: ${loop2s_gate}"

if [[ "$loop2s_gate" =~ status=DONE ]]; then
  loop2safety="DONE"
  status="DONE"
else
  loop2safety="STALL"
  status="STALL"
fi

echo "STCC_XL_GATE: status=${status} | stcc0=${stcc0} | loop1=${loop1} | loop2=${loop2} | loop2safety=${loop2safety}"
if [[ "$status" == "ERROR" ]]; then
  exit 1
fi
