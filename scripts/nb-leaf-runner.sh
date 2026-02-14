#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_SCRIPT="$ROOT_DIR/scripts/run-codex-agent.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/nb-leaf-runner.sh [--retries N] [--leaf-progress]

Behavior:
  - Runs NB leaf agents directly: nb-1 -> nb-2 -> nb-3 -> nb-4
  - Emits final nb-loop gate block:
    NB::nb-loop::STATUS::<OK|STOP|FAIL>
    NB::nb-loop::READ::...
    NB::nb-loop::WROTE::<...>
    NB::nb-loop::BLOCKERS::<0|n>::...
    NB::nb-loop::NEXT::<...>
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
  echo "[nb-leaf] $*" >&2
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

emit_nb_loop_gate() {
  local status="$1"
  local blockers="$2"
  local next="$3"

  echo "NB::nb-loop::STATUS::${status}"
  echo "NB::nb-loop::READ::docs/new-brief.md,docs/new-brief2.md,docs/brief.md"
  echo "NB::nb-loop::WROTE::<NONE>"
  echo "NB::nb-loop::BLOCKERS::${blockers}"
  echo "NB::nb-loop::NEXT::${next}"
}

handle_fail() {
  local next="$1"
  emit_nb_loop_gate "FAIL" "1::agent failure or malformed gate" "$next"
  exit 1
}

status="OK"
blockers="0::NONE"
next_line="Proceed to specs pipeline"

log "running nb-1"
nb1_out="$(run_leaf "nb-1")" || handle_fail "Re-run nb-1"
nb1_status_line="$(get_line "$nb1_out" '^NB::nb-1::STATUS::')"
nb1_blockers_line="$(get_line "$nb1_out" '^NB::nb-1::BLOCKERS::')"
nb1_next_line="$(get_line "$nb1_out" '^NB::nb-1::NEXT::')"
if [[ -z "$nb1_status_line" ]]; then
  handle_fail "Re-run nb-1 (missing status gate)"
fi
nb1_status="${nb1_status_line##*::}"
if [[ "$nb1_status" != "OK" ]]; then
  status="$nb1_status"
  blockers="${nb1_blockers_line#NB::nb-1::BLOCKERS::}"
  next_line="${nb1_next_line#NB::nb-1::NEXT::}"
  emit_nb_loop_gate "$status" "${blockers:-1::nb-1 failed}" "${next_line:-Handle nb-1 blockers}"
  [[ "$status" == "FAIL" ]] && exit 1 || exit 0
fi

log "running nb-2"
nb2_out="$(run_leaf "nb-2")" || handle_fail "Re-run nb-2"
nb2_status_line="$(get_line "$nb2_out" '^NB::nb-2::STATUS::')"
nb2_blockers_line="$(get_line "$nb2_out" '^NB::nb-2::BLOCKERS::')"
nb2_next_line="$(get_line "$nb2_out" '^NB::nb-2::NEXT::')"
if [[ -z "$nb2_status_line" ]]; then
  handle_fail "Re-run nb-2 (missing status gate)"
fi
nb2_status="${nb2_status_line##*::}"
if [[ "$nb2_status" != "OK" ]]; then
  status="$nb2_status"
  blockers="${nb2_blockers_line#NB::nb-2::BLOCKERS::}"
  next_line="${nb2_next_line#NB::nb-2::NEXT::}"
  emit_nb_loop_gate "$status" "${blockers:-1::nb-2 stopped/failed}" "${next_line:-Provide nb-2 decisions}"
  [[ "$status" == "FAIL" ]] && exit 1 || exit 0
fi

log "running nb-3"
nb3_out="$(run_leaf "nb-3")" || handle_fail "Re-run nb-3"
nb3_status_line="$(get_line "$nb3_out" '^NB::nb-3::STATUS::')"
nb3_blockers_line="$(get_line "$nb3_out" '^NB::nb-3::BLOCKERS::')"
nb3_next_line="$(get_line "$nb3_out" '^NB::nb-3::NEXT::')"
if [[ -z "$nb3_status_line" ]]; then
  handle_fail "Re-run nb-3 (missing status gate)"
fi
nb3_status="${nb3_status_line##*::}"
if [[ "$nb3_status" != "OK" ]]; then
  status="$nb3_status"
  blockers="${nb3_blockers_line#NB::nb-3::BLOCKERS::}"
  next_line="${nb3_next_line#NB::nb-3::NEXT::}"
  emit_nb_loop_gate "$status" "${blockers:-1::nb-3 stopped/failed}" "${next_line:-Fix nb-3 blockers}"
  [[ "$status" == "FAIL" ]] && exit 1 || exit 0
fi

log "running nb-4"
nb4_out="$(run_leaf "nb-4")" || handle_fail "Re-run nb-4"
nb4_status_line="$(get_line "$nb4_out" '^NB::nb-4::STATUS::')"
nb4_blockers_line="$(get_line "$nb4_out" '^NB::nb-4::BLOCKERS::')"
nb4_next_line="$(get_line "$nb4_out" '^NB::nb-4::NEXT::')"
if [[ -z "$nb4_status_line" ]]; then
  handle_fail "Re-run nb-4 (missing status gate)"
fi
nb4_status="${nb4_status_line##*::}"
if [[ "$nb4_status" != "OK" ]]; then
  status="$nb4_status"
  blockers="${nb4_blockers_line#NB::nb-4::BLOCKERS::}"
  next_line="${nb4_next_line#NB::nb-4::NEXT::}"
  emit_nb_loop_gate "$status" "${blockers:-1::nb-4 stopped/failed}" "${next_line:-Fix brief via nb-3 then rerun nb-4}"
  [[ "$status" == "FAIL" ]] && exit 1 || exit 0
fi

emit_nb_loop_gate "OK" "0::NONE" "Proceed to specs pipeline"

