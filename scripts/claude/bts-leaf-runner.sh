#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"
RUNNER_SCRIPT="$ROOT_DIR/scripts/claude/run-agent.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/claude/bts-leaf-runner.sh [--retries N] [--iter-limit N] [--leaf-progress]

Behavior:
  - Runs BTS with leaf visibility:
    bts-0 once
    loop run #1: (bts-1 -> bts-2) until NO_PATCHES/OPEN_QUESTIONS/ITER_LIMIT/ERROR
    loop run #2: same stability rerun
  - Emits final stage gate:
    BTS_FULL_GATE: status=<DONE|OPEN_QUESTIONS|STALL|ERROR> | loop1=<...> | loop2=<...>
EOF
}

RETRIES=5
ITER_LIMIT=10
LEAF_PROGRESS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retries)
      RETRIES="${2:-}"
      shift 2
      ;;
    --iter-limit)
      ITER_LIMIT="${2:-}"
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
  echo "[bts-leaf] $*" >&2
}

get_line() {
  local output="$1"
  local pattern="$2"
  echo "$output" | grep -E "$pattern" | tail -n1 || true
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

bts_loop_status=""
bts_loop_last_patches="no"
bts_loop_last_questions="no"

run_bts_loop_once() {
  local run_label="$1"
  local i=0

  while [[ "$i" -lt "$ITER_LIMIT" ]]; do
    i=$((i + 1))
    log "${run_label}: iteration ${i} running bts-1"
    b1_out="$(run_leaf "bts-1")" || {
      bts_loop_status="ERROR"
      return
    }
    b1_gate="$(get_line "$b1_out" '^BTS1_GATE: ')"
    if [[ -z "$b1_gate" ]]; then
      bts_loop_status="ERROR"
      return
    fi

    if [[ "$b1_gate" =~ patches_proposed=yes ]]; then
      bts_loop_last_patches="yes"
    else
      bts_loop_last_patches="no"
    fi
    if [[ "$b1_gate" =~ open_questions=yes ]]; then
      bts_loop_last_questions="yes"
      bts_loop_status="OPEN_QUESTIONS"
      return
    else
      bts_loop_last_questions="no"
    fi

    if [[ "$b1_gate" =~ patches_proposed=no ]]; then
      bts_loop_status="NO_PATCHES"
      return
    fi

    log "${run_label}: iteration ${i} running bts-2"
    b2_out="$(run_leaf "bts-2")" || {
      bts_loop_status="ERROR"
      return
    }
    b2_gate="$(get_line "$b2_out" '^BTS2_GATE: ')"
    if [[ -z "$b2_gate" ]]; then
      bts_loop_status="ERROR"
      return
    fi
    if [[ ! "$b2_gate" =~ apply_log_written=yes ]]; then
      bts_loop_status="ERROR"
      return
    fi
  done

  bts_loop_status="ITER_LIMIT"
}

loop1="ERROR"
loop2="ERROR"
status="ERROR"

log "running bts-0"
b0_out="$(run_leaf "bts-0")" || {
  echo "BTS_FULL_GATE: status=ERROR | loop1=ERROR | loop2=ERROR"
  exit 1
}
b0_gate="$(get_line "$b0_out" '^BTS0_GATE: ')"
b0_written="$(get_line "$b0_out" '^Written: docs/specs\.md$')"
if [[ -n "$b0_gate" ]]; then
  if [[ ! "$b0_gate" =~ status=ok ]]; then
    echo "BTS_FULL_GATE: status=ERROR | loop1=ERROR | loop2=ERROR"
    exit 1
  fi
elif [[ -z "$b0_written" ]]; then
  echo "BTS_FULL_GATE: status=ERROR | loop1=ERROR | loop2=ERROR"
  exit 1
fi
if [[ ! -s "$ROOT_DIR/docs/specs.md" ]]; then
  echo "BTS_FULL_GATE: status=ERROR | loop1=ERROR | loop2=ERROR"
  exit 1
fi

run_bts_loop_once "run#1"
loop1="$bts_loop_status"
case "$loop1" in
  NO_PATCHES) ;;
  OPEN_QUESTIONS)
    echo "BTS_FULL_GATE: status=OPEN_QUESTIONS | loop1=${loop1} | loop2=ERROR"
    exit 0
    ;;
  ITER_LIMIT)
    echo "BTS_FULL_GATE: status=STALL | loop1=${loop1} | loop2=ERROR"
    exit 0
    ;;
  ERROR|*)
    echo "BTS_FULL_GATE: status=ERROR | loop1=ERROR | loop2=ERROR"
    exit 1
    ;;
esac

run_bts_loop_once "run#2"
loop2="$bts_loop_status"
case "$loop2" in
  NO_PATCHES)
    status="DONE"
    ;;
  OPEN_QUESTIONS)
    status="OPEN_QUESTIONS"
    ;;
  ITER_LIMIT)
    status="STALL"
    ;;
  ERROR|*)
    status="ERROR"
    ;;
esac

echo "BTS_FULL_GATE: status=${status} | loop1=${loop1} | loop2=${loop2}"
if [[ "$status" == "ERROR" ]]; then
  exit 1
fi
