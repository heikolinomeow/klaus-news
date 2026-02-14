#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"

usage() {
  cat <<'EOF'
Usage:
  scripts/run-codex-agent.sh [--stream|--progress] [--retries N] <agent-name-or-md-path>

Behavior:
  - Resolves an agent Markdown file under .claude/commands
  - Runs it with `codex exec --ephemeral`
  - Each invocation uses a fresh context/session
  - Default output: only the final assistant message (clean for gate parsing)
  - `--stream`: show full Codex CLI stream/debug output
  - `--progress`: compact status updates while running (no full stream)
  - `--retries N`: retry transient transport failures (default: 5)

Examples:
  scripts/run-codex-agent.sh nb-loop
  scripts/run-codex-agent.sh bts-2
  scripts/run-codex-agent.sh .claude/commands/brief-to-specs/bts-loop.md
EOF
}

STREAM=0
PROGRESS=0
RETRIES=5
PROGRESS_INTERVAL=5
FAIL_TAIL_LINES=120

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stream)
      STREAM=1
      shift
      ;;
    --progress)
      PROGRESS=1
      shift
      ;;
    --retries)
      RETRIES="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

if [[ "$STREAM" -eq 1 && "$PROGRESS" -eq 1 ]]; then
  echo "Use either --stream or --progress, not both." >&2
  exit 2
fi

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -x "$CODEX_BIN" ]]; then
  echo "Codex binary not executable: $CODEX_BIN" >&2
  exit 2
fi

target="$1"
agent_file=""

if [[ -f "$target" ]]; then
  agent_file="$target"
elif [[ -f "$ROOT_DIR/$target" ]]; then
  agent_file="$ROOT_DIR/$target"
elif [[ "$target" == *.md && -f "$ROOT_DIR/.claude/commands/$target" ]]; then
  agent_file="$ROOT_DIR/.claude/commands/$target"
else
  matches="$(find "$ROOT_DIR/.claude/commands" -type f -name "${target}.md" 2>/dev/null || true)"
  count="$(echo "$matches" | sed '/^$/d' | wc -l | tr -d ' ')"
  if [[ "$count" -eq 1 ]]; then
    agent_file="$(echo "$matches" | sed '/^$/d')"
  elif [[ "$count" -gt 1 ]]; then
    echo "Ambiguous agent name '$target'. Matches:" >&2
    echo "$matches" >&2
    exit 2
  else
    echo "Agent file not found for '$target'." >&2
    exit 2
  fi
fi

if [[ ! -f "$agent_file" ]]; then
  echo "Resolved agent path does not exist: $agent_file" >&2
  exit 2
fi

if [[ "$STREAM" -eq 1 ]]; then
  "$CODEX_BIN" exec \
    --full-auto \
    --ephemeral \
    --color never \
    -C "$ROOT_DIR" \
    - < "$agent_file"
  exit $?
fi

tmp_dir="$(mktemp -d)"
msg_file="$tmp_dir/last_message.txt"
log_file="$tmp_dir/full_stream.log"

attempt=1
while [[ "$attempt" -le "$RETRIES" ]]; do
  : > "$msg_file"
  : > "$log_file"

  if [[ "$PROGRESS" -eq 1 ]]; then
    "$CODEX_BIN" exec \
      --full-auto \
      --ephemeral \
      --color never \
      -C "$ROOT_DIR" \
      -o "$msg_file" \
      - < "$agent_file" >"$log_file" 2>&1 &
    codex_pid=$!
    start_ts="$(date +%s)"
    last_lines=0
    processed_lines=0
    last_signal=""
    last_activity=""

    while kill -0 "$codex_pid" 2>/dev/null; do
      sleep "$PROGRESS_INTERVAL"
      now_ts="$(date +%s)"
      elapsed=$((now_ts - start_ts))
      line_count=0
      if [[ -f "$log_file" ]]; then
        line_count="$(wc -l < "$log_file" | tr -d ' ')"
      fi
      delta=$((line_count - last_lines))
      last_lines="$line_count"
      signal_line="$(tail -n 200 "$log_file" 2>/dev/null | grep -E 'Reconnecting|stream disconnected|retrying sampling request|ERROR:' | tail -n1 || true)"
      if [[ -n "$signal_line" && "$signal_line" != "$last_signal" ]]; then
        echo "run-codex-agent: signal: $signal_line" >&2
        last_signal="$signal_line"
      fi

      if [[ "$line_count" -gt "$processed_lines" ]]; then
        activity_lines="$(sed -n "$((processed_lines + 1)),${line_count}p" "$log_file" 2>/dev/null | grep -E "run-codex-agent\\.sh stcc-[0-9]|^STCC_A[1-5]_GATE:|^STCC_LOOP_GATE:" || true)"
        if [[ -n "$activity_lines" ]]; then
          while IFS= read -r act; do
            [[ -z "$act" ]] && continue
            # Ignore template/spec lines that still contain placeholders.
            if [[ "$act" == *"<"*">"* ]]; then
              continue
            fi
            if [[ "$act" != "$last_activity" ]]; then
              echo "run-codex-agent: activity: $act" >&2
              last_activity="$act"
            fi
          done <<< "$activity_lines"
        fi
        processed_lines="$line_count"
      fi

      echo "run-codex-agent: running '${target}' attempt ${attempt}/${RETRIES} elapsed=${elapsed}s new_log_lines=${delta}" >&2
    done

    set +e
    wait "$codex_pid"
    rc=$?
    set -e
  else
    set +e
    "$CODEX_BIN" exec \
      --full-auto \
      --ephemeral \
      --color never \
      -C "$ROOT_DIR" \
      -o "$msg_file" \
      - < "$agent_file" >"$log_file" 2>&1
    rc=$?
    set -e
  fi

  if [[ $rc -eq 0 && -s "$msg_file" ]]; then
    cat "$msg_file"
    exit 0
  fi

  if [[ "$attempt" -lt "$RETRIES" ]]; then
    sleep_secs=$((attempt * 2))
    echo "run-codex-agent: retry ${attempt}/${RETRIES} after failure (rc=${rc})" >&2
    sleep "$sleep_secs"
  fi
  attempt=$((attempt + 1))
done

echo "run-codex-agent: failed after ${RETRIES} attempt(s) for '${target}'" >&2
echo "run-codex-agent: showing last ${FAIL_TAIL_LINES} log lines (use --stream for full output)" >&2
tail -n "$FAIL_TAIL_LINES" "$log_file" >&2 || true
if [[ -f "$msg_file" && ! -s "$msg_file" ]]; then
  echo "run-codex-agent: no final agent message captured" >&2
fi
exit 1
