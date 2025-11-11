#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
HISTORY_FILE="$LOG_DIR/history.log"

mkdir -p "$LOG_DIR" "$BACKUP_DIR"

SPINNER_FRAMES=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
SPINNER_PID=""
SPINNER_ACTIVE=0
CURSOR_HIDDEN=0

start_spinner() {
  local watch_pid="$1"
  local message="$2"
  if [[ ! -t 1 ]]; then
    SPINNER_ACTIVE=0
    SPINNER_PID=""
    return
  fi
  {
    local text="$message"
    local i=0
    local frame_count=${#SPINNER_FRAMES[@]}
    while kill -0 "$watch_pid" 2>/dev/null; do
      printf "\r%s %s" "${SPINNER_FRAMES[$i]}" "$text"
      sleep 0.1
      ((i=(i + 1) % frame_count))
    done
  } &
  SPINNER_PID=$!
  SPINNER_ACTIVE=1
  if command -v tput >/dev/null 2>&1; then
    if tput civis >/dev/null 2>&1; then
      CURSOR_HIDDEN=1
    fi
  fi
}

stop_spinner() {
  if [[ "${SPINNER_ACTIVE:-0}" -eq 1 ]]; then
    wait "$SPINNER_PID" 2>/dev/null || true
    printf "\r\033[K"
    if [[ "$CURSOR_HIDDEN" -eq 1 ]] && command -v tput >/dev/null 2>&1; then
      tput cnorm >/dev/null 2>&1 || true
    fi
    SPINNER_ACTIVE=0
    CURSOR_HIDDEN=0
    SPINNER_PID=""
  fi
}

trap stop_spinner EXIT

show_step() {
  local current="$1"
  local total="$2"
  shift 2
  printf "[%s/%s] %s\n" "$current" "$total" "$*"
}

send_notification() {
  local title="$1"
  local message="$2"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"${message}\" with title \"${title}\"" >/dev/null
  fi
}

sanitize_field() {
  local value="${1//$'\r'/ }"
  value="${value//$'\n'/ }"
  value="${value//|/\/}"
  value="$(echo "$value" | sed 's/[[:space:]]\{2,\}/ /g')"
  echo "$value"
}

format_bytes() {
  local bytes="$1"
  if [[ "$bytes" -lt 1024 ]]; then
    echo "${bytes} B"
    return
  fi
  local kb=$((bytes / 1024))
  if [[ "$kb" -lt 1024 ]]; then
    echo "${kb} KB"
    return
  fi
  local mb=$((kb / 1024))
  echo "${mb} MB"
}

log_history() {
  local status="$1"
  local mode="$2"
  local source="$3"
  local target="$4"
  local duration="$5"
  local warnings="$6"
  local backup_path="$7"
  local note="$8"

  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local safe_source safe_target safe_warnings safe_backup safe_note
  safe_source=$(sanitize_field "$source")
  safe_target=$(sanitize_field "$target")
  safe_warnings=$(sanitize_field "$warnings")
  safe_backup=$(sanitize_field "$backup_path")
  safe_note=$(sanitize_field "$note")

  printf "%s|%s|%s|%s|%s|%s|%s|%s|%s\n" \
    "$timestamp" "$mode" "$safe_source" "$safe_target" "$status" "$duration" \
    "$safe_warnings" "$safe_backup" "$safe_note" >> "$HISTORY_FILE"
}

create_backup() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local stamp
    stamp="$(date +"%Y%m%dT%H%M%S")"
    local name="${file//\//__}"
    name="${name// /_}"
    local backup_path="$BACKUP_DIR/${name}.${stamp}"
    if cp "$file" "$backup_path"; then
      echo "$backup_path"
    else
      echo ""
    fi
  else
    echo ""
  fi
}

restore_backup_if_needed() {
  local backup="$1"
  local destination="$2"
  if [[ -n "$backup" && -f "$backup" ]]; then
    cp "$backup" "$destination"
    echo "↩️  Restored previous version from backup."
  fi
}

run_conversion() {
  local mode="$1"
  local source="$2"
  local target="$3"
  local pandoc_args=("${@:4}")

  local backup_path
  backup_path="$(create_backup "$target")"

  local tmp_err
  tmp_err="$(mktemp)"
  SECONDS=0

  local pandoc_cmd=(pandoc "$source")
  if [[ ${#pandoc_args[@]} -gt 0 ]]; then
    pandoc_cmd+=("${pandoc_args[@]}")
  fi
  pandoc_cmd+=(-o "$target")

  "${pandoc_cmd[@]}" 2>"$tmp_err" &
  local pandoc_pid=$!
  local spinner_msg="Converting $(basename "$source")…"
  start_spinner "$pandoc_pid" "$spinner_msg"

  if wait "$pandoc_pid"; then
    stop_spinner
    local duration="$SECONDS"
    local warnings=""
    if [[ -s "$tmp_err" ]]; then
      cat "$tmp_err" >&2
      warnings="$(tr '\n' ' ' < "$tmp_err" | sed 's/[[:space:]]\{2,\}/ /g')"
      echo "⚠️  Pandoc warnings detected."
    fi
    local size_bytes=0
    if [[ -f "$target" ]]; then
      size_bytes=$(stat -f%z "$target" 2>/dev/null || wc -c < "$target")
    fi
    local size_human
    size_human="$(format_bytes "$size_bytes")"
    echo "✅ Success! Wrote: $target"
    echo "⏱️  Completed in ${duration}s · Output size: ${size_human}"
    log_history "success" "$mode" "$source" "$target" "$duration" \
      "${warnings:-none}" "$backup_path" "completed"
    local notify_title notify_message
    if [[ "$mode" == "to-docx" || "$mode" == "auto-to-docx" ]]; then
      notify_title="Markdown → Word complete"
    else
      notify_title="Word → Markdown complete"
    fi
    notify_message="$(basename "$source") → $(basename "$target")"
    send_notification "$notify_title" "$notify_message"
    rm -f "$tmp_err"
    return 0
  else
    stop_spinner
    local duration="$SECONDS"
    local error_detail
    if [[ -s "$tmp_err" ]]; then
      cat "$tmp_err" >&2
      error_detail="$(tr '\n' ' ' < "$tmp_err" | sed 's/[[:space:]]\{2,\}/ /g')"
    else
      error_detail="pandoc failed"
    fi
    echo "❌ Conversion failed. Leaving existing file untouched." >&2
    echo "💡 Tip: Check the Pandoc error above, confirm the source path exists, and try running with an explicit mode (to-md/to-docx)." >&2
    echo "🔁 If the issue persists, run 'brew upgrade pandoc' or open the document in Word once to ensure it's not locked." >&2
    restore_backup_if_needed "$backup_path" "$target"
    log_history "failure" "$mode" "$source" "$target" "$duration" \
      "error" "$backup_path" "$error_detail"
    send_notification "Conversion failed" "$(basename "$source")"
    rm -f "$tmp_err"
    exit 1
  fi
}

# Help text
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  cat << 'EOF'
Word ↔ Markdown Sync Script

USAGE:
  ./docx-sync.sh <docx-file> <md-file> [mode]

MODES:
  to-md    Convert Word → Markdown
  to-docx  Convert Markdown → Word
  auto     Auto-detect (newest file wins) [default]

EXAMPLES:
  ./docx-sync.sh docs/report.docx docs/report.md to-md
  ./docx-sync.sh docs/report.docx docs/report.md to-docx
  ./docx-sync.sh docs/report.docx docs/report.md auto

TIP: Use the interactive menu instead:
  dsync

History is stored at logs/history.log with automatic backups under backups/.

EOF
  exit 0
fi

DOCX="${1:-docs/presentation.docx}"
MD="${2:-docs/presentation.md}"
MODE="${3:-auto}"   # auto | to-md | to-docx

# Check for pandoc
if ! command -v pandoc >/dev/null 2>&1; then
  echo "❌ Error: pandoc not found" >&2
  echo "📦 Install with: brew install pandoc" >&2
  echo "💡 Tip: After installing, rerun ./scripts/setup.sh so watch mode dependencies stay in sync." >&2
  exit 1
fi
echo "[1/3] ✅ Pandoc detected"

case "$MODE" in
  to-md)
    echo "📄 Converting Word → Markdown..."
    show_step 2 3 "Preparing Markdown folder..."
    mkdir -p "$(dirname "$MD")"
    show_step 3 3 "Running pandoc (Word → Markdown)..."
    run_conversion "to-md" "$DOCX" "$MD" -t gfm
    ;;
  to-docx)
    echo "📘 Converting Markdown → Word..."
    show_step 2 3 "Preparing Word folder..."
    mkdir -p "$(dirname "$DOCX")"
    show_step 3 3 "Running pandoc (Markdown → Word)..."
    run_conversion "to-docx" "$MD" "$DOCX"
    ;;
  auto)
    if [[ -f "$DOCX" && -f "$MD" ]]; then
      if [[ "$DOCX" -nt "$MD" ]]; then
        echo "🔍 Word file is newer, converting to Markdown..."
        show_step 2 3 "Preparing Markdown folder..."
        mkdir -p "$(dirname "$MD")"
        show_step 3 3 "Running pandoc (Word → Markdown)..."
        run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
      else
        echo "🔍 Markdown file is newer, converting to Word..."
        show_step 2 3 "Preparing Word folder..."
        mkdir -p "$(dirname "$DOCX")"
        show_step 3 3 "Running pandoc (Markdown → Word)..."
        run_conversion "auto-to-docx" "$MD" "$DOCX"
      fi
    elif [[ -f "$DOCX" ]]; then
      echo "📄 Found Word file, converting to Markdown..."
      show_step 2 3 "Preparing Markdown folder..."
      mkdir -p "$(dirname "$MD")"
      show_step 3 3 "Running pandoc (Word → Markdown)..."
      run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
    elif [[ -f "$MD" ]]; then
      echo "📘 Found Markdown file, converting to Word..."
      show_step 2 3 "Preparing Word folder..."
      mkdir -p "$(dirname "$DOCX")"
      show_step 3 3 "Running pandoc (Markdown → Word)..."
      run_conversion "auto-to-docx" "$MD" "$DOCX"
    else
      echo "❌ Error: Neither $DOCX nor $MD exists" >&2
      echo "💡 Tip: Run 'dsync' option 1 to create the Markdown twin automatically." >&2
      echo "📂 You can also drop a .docx file into docs/ and rerun this command." >&2
      exit 1
    fi
    ;;
  *)
    echo "❌ Unknown mode: $MODE" >&2
    echo "💡 Tip: Use one of: to-md, to-docx, or auto (default)." >&2
    exit 1
    ;;
esac
