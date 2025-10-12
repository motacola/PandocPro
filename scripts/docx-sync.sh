#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
HISTORY_FILE="$LOG_DIR/history.log"

mkdir -p "$LOG_DIR" "$BACKUP_DIR"

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

  if "${pandoc_cmd[@]}" 2>"$tmp_err"; then
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
    rm -f "$tmp_err"
    return 0
  else
    local duration="$SECONDS"
    local error_detail
    if [[ -s "$tmp_err" ]]; then
      cat "$tmp_err" >&2
      error_detail="$(tr '\n' ' ' < "$tmp_err" | sed 's/[[:space:]]\{2,\}/ /g')"
    else
      error_detail="pandoc failed"
    fi
    echo "❌ Conversion failed. Leaving existing file untouched." >&2
    restore_backup_if_needed "$backup_path" "$target"
    log_history "failure" "$mode" "$source" "$target" "$duration" \
      "error" "$backup_path" "$error_detail"
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
  exit 1
fi

case "$MODE" in
  to-md)
    echo "📄 Converting Word → Markdown..."
    mkdir -p "$(dirname "$MD")"
    run_conversion "to-md" "$DOCX" "$MD" -t gfm
    ;;
  to-docx)
    echo "📘 Converting Markdown → Word..."
    mkdir -p "$(dirname "$DOCX")"
    run_conversion "to-docx" "$MD" "$DOCX"
    ;;
  auto)
    if [[ -f "$DOCX" && -f "$MD" ]]; then
      if [[ "$DOCX" -nt "$MD" ]]; then
        echo "🔍 Word file is newer, converting to Markdown..."
        mkdir -p "$(dirname "$MD")"
        run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
      else
        echo "🔍 Markdown file is newer, converting to Word..."
        mkdir -p "$(dirname "$DOCX")"
        run_conversion "auto-to-docx" "$MD" "$DOCX"
      fi
    elif [[ -f "$DOCX" ]]; then
      echo "📄 Found Word file, converting to Markdown..."
      mkdir -p "$(dirname "$MD")"
      run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
    elif [[ -f "$MD" ]]; then
      echo "📘 Found Markdown file, converting to Word..."
      mkdir -p "$(dirname "$DOCX")"
      run_conversion "auto-to-docx" "$MD" "$DOCX"
    else
      echo "❌ Error: Neither $DOCX nor $MD exists" >&2
      echo "💡 Tip: Run 'dsync' for an interactive menu" >&2
      exit 1
    fi
    ;;
  *)
    echo "❌ Unknown mode: $MODE" >&2
    exit 1
    ;;
esac
