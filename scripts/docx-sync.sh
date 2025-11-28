#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
HISTORY_FILE="$LOG_DIR/history.log"
TEMPLATE_DIR="$PROJECT_ROOT/templates"

mkdir -p "$LOG_DIR" "$BACKUP_DIR" "$TEMPLATE_DIR"

DEFAULT_PDF_CSS="$TEMPLATE_DIR/pdf.css"
DEFAULT_HTML_CSS="$TEMPLATE_DIR/html.css"
REFERENCE_DOC="${DOCSYNC_REFERENCE_DOC:-$TEMPLATE_DIR/reference.docx}"
REFERENCE_PPTX="${DOCSYNC_REFERENCE_PPTX:-$TEMPLATE_DIR/reference.pptx}"

MAX_TEXT_BYTES="${DOCSYNC_MAX_TEXT_BYTES:-20971520}"
MAX_BINARY_BYTES="${DOCSYNC_MAX_BINARY_BYTES:-52428800}"
MAX_HTML_IMAGES="${DOCSYNC_MAX_HTML_IMAGES:-120}"
PDF_ENGINE="${DOCSYNC_PDF_ENGINE:-}"

create_default_styles() {
  if [[ ! -f "$DEFAULT_PDF_CSS" ]]; then
cat >"$DEFAULT_PDF_CSS" <<'EOF'
body {
  font-family: "Georgia", serif;
  font-size: 11pt;
  color: #222;
  line-height: 1.6;
  margin: 1in;
}
h1, h2, h3 {
  font-family: "Helvetica", Arial, sans-serif;
  margin-top: 24pt;
  color: #0f172a;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16pt 0;
}
th, td {
  border: 1px solid #cbd5f5;
  padding: 8pt;
}
blockquote {
  border-left: 4px solid #94a3b8;
  padding-left: 12pt;
  color: #475569;
  font-style: italic;
}
EOF
  fi

  if [[ ! -f "$DEFAULT_HTML_CSS" ]]; then
cat >"$DEFAULT_HTML_CSS" <<'EOF'
body {
  font-family: "Inter", "Segoe UI", sans-serif;
  color: #0f172a;
  margin: 2rem auto;
  padding: 0 1.5rem;
  max-width: 800px;
  line-height: 1.7;
}
pre, code {
  font-family: "SFMono-Regular", Consolas, monospace;
  background: #0f172a15;
  border-radius: 4px;
}
code { padding: 2px 4px; }
pre {
  padding: 12px;
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 24px 0;
}
th, td {
  border: 1px solid #cbd5f5;
  padding: 8px;
  text-align: left;
}
blockquote {
  border-left: 4px solid #93c5fd;
  margin: 0;
  padding: 0 0 0 1rem;
  color: #1d4ed8;
}
EOF
  fi
}

create_default_styles

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

file_size_bytes() {
  local file="$1"
  if stat -f%z "$file" >/dev/null 2>&1; then
    stat -f%z "$file"
  else
    stat -c%s "$file"
  fi
}

detect_text_format() {
  local source="$1"
  local ext="${source##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    html|htm)
      echo "html"
      return 0
      ;;
    md|markdown|mdown|mkd|txt)
      echo "gfm"
      return 0
      ;;
  esac
  if head -n 5 "$source" | grep -qi '<html'; then
    echo "html"
  else
    echo "gfm"
  fi
}

lint_source_file() {
  local file="$1"
  local kind="$2"
  [[ "${DOCSYNC_SKIP_LINT:-0}" == "1" ]] && return 0

  if [[ ! -f "$file" ]]; then
    echo "❌ Lint failed: source file not found -> $file" >&2
    exit 1
  fi

  local size
  size=$(file_size_bytes "$file")
  local fatal=0
  local messages=()

  if [[ "$kind" == "docx" ]]; then
    if (( size > MAX_BINARY_BYTES )); then
      fatal=1
      messages+=("DOCX file is $((size / 1024 / 1024))MB (limit: $((MAX_BINARY_BYTES / 1024 / 1024))MB)")
    fi
  else
    if (( size > MAX_TEXT_BYTES )); then
      fatal=1
      messages+=("Text source is $((size / 1024 / 1024))MB (limit: $((MAX_TEXT_BYTES / 1024 / 1024))MB)")
    fi
    if perl -ne 'exit 0 if /\0/; END { exit 1 }' "$file"; then
      fatal=1
      messages+=("Binary data detected in text file (null bytes present)")
    fi
  fi

  if [[ "$kind" == "html" ]]; then
    local img_count
    img_count=$(grep -o -i '<img' "$file" | wc -l | tr -d ' ')
    if (( img_count > MAX_HTML_IMAGES )); then
      messages+=("HTML includes $img_count images (soft limit $MAX_HTML_IMAGES). Consider splitting the file.")
    fi

    local missing_refs=()
    local dir
    dir="$(dirname "$file")"
    while IFS= read -r ref; do
      [[ -z "$ref" ]] && continue
      if [[ "$ref" =~ ^(https?|data:|file:) ]]; then
        continue
      fi
      local abs="$dir/$ref"
      if [[ ! -e "$abs" ]]; then
        missing_refs+=("$ref")
      fi
    done < <(grep -o -i '<img[^>]*src="[^"]+"' "$file" | sed -E 's/.*src="([^"]+)".*/\1/' | sort -u | head -n 20)
    if (( ${#missing_refs[@]} )); then
      messages+=("Missing image references: ${missing_refs[*]}")
    fi
  fi

  if (( fatal )); then
    echo "❌ Pre-flight checks failed:" >&2
    printf '  - %s\n' "${messages[@]}" >&2
    echo "Set DOCSYNC_SKIP_LINT=1 to override (not recommended)." >&2
    exit 1
  fi

  if (( ${#messages[@]} )); then
    echo "⚠️  Pre-flight warnings:" >&2
    printf '  - %s\n' "${messages[@]}" >&2
  fi
}

resolve_pdf_engine() {
  if [[ -n "$PDF_ENGINE" ]]; then
    if command -v "$PDF_ENGINE" >/dev/null 2>&1; then
      return 0
    fi
    echo "⚠️  Requested PDF engine '$PDF_ENGINE' not found, auto-selecting." >&2
  fi
  for candidate in weasyprint wkhtmltopdf prince pdfroff; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PDF_ENGINE="$candidate"
      return 0
    fi
  done
  PDF_ENGINE=""
  return 1
}

replace_extension() {
  local path="$1"
  local new_ext="$2"
  if [[ "$path" == *.* ]]; then
    echo "${path%.*}.$new_ext"
  else
    echo "$path.$new_ext"
  fi
}

format_label() {
  case "$1" in
    html) echo "HTML" ;;
    gfm) echo "Markdown" ;;
    docx) echo "Word" ;;
    *) echo "$1" ;;
  esac
}

sanitize_field() {
  local value="${1//$'\r'/ }"
  value="${value//$'\n'/ }"
  value="${value//|/\/}"
  value="$(printf '%s\n' "$value" | tr -s '[:space:]' ' ')"
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
  local spinner_msg
  spinner_msg="Converting $(basename "$source")…"
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
    case "$mode" in
      to-docx|auto-to-docx)
        notify_title="Markdown → Word complete"
        ;;
      to-pptx)
        notify_title="Markdown → PowerPoint complete"
        ;;
      to-pdf)
        notify_title="Markdown/HTML → PDF complete"
        ;;
      to-html)
        notify_title="Markdown → HTML complete"
        ;;
      *)
        notify_title="Conversion complete"
        ;;
    esac
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
    if [[ "$mode" == "to-pptx" ]] && [[ "$error_detail" =~ Unknown\ writer|pptx ]]; then
      echo "💡 Pandoc PPTX writer missing. Upgrade pandoc (brew upgrade pandoc) or reinstall with PPTX support." >&2
    fi
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
  ./docx-sync.sh <docx-file> <text-file> [mode] [output]

MODES:
  to-md    Convert Word → Markdown
  to-docx  Convert Markdown → Word
  to-pptx  Convert Markdown/HTML → PowerPoint
  to-pdf   Convert Markdown/HTML → PDF
  to-html  Convert Markdown → styled HTML export
  auto     Auto-detect (newest file wins) [default]

EXAMPLES:
  ./docx-sync.sh docs/report.docx docs/report.md to-md
  ./docx-sync.sh docs/report.docx docs/report.md to-docx
   ./docx-sync.sh docs/slides.docx docs/slides.md to-pptx
  ./docx-sync.sh docs/report.docx docs/report.md to-pdf docs/report.pdf
  ./docx-sync.sh docs/report.docx docs/page.html to-docx
  ./docx-sync.sh docs/report.docx docs/report.md auto

TIP: Use the interactive menu instead:
  dsync

History is stored at logs/history.log with automatic backups under backups/.

EOF
  exit 0
fi

DOCX="${1:-docs/presentation.docx}"
MD="${2:-docs/presentation.md}"
MODE="${3:-auto}"   # auto | to-md | to-docx | to-pptx | to-pdf | to-html
OUTPUT_OVERRIDE="${4:-}"
TEXT_ONLY="${DOCSYNC_TEXT_ONLY:-0}"

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
    lint_source_file "$DOCX" "docx"
    echo "📄 Converting Word → Markdown..."
    show_step 2 3 "Preparing Markdown folder..."
    mkdir -p "$(dirname "$MD")"
    show_step 3 3 "Running pandoc (Word → Markdown)..."
    run_conversion "to-md" "$DOCX" "$MD" -t gfm
    ;;
  to-docx)
    SOURCE_FORMAT=$(detect_text_format "$MD")
    lint_source_file "$MD" "$SOURCE_FORMAT"
    READABLE_SOURCE=$(format_label "$SOURCE_FORMAT")
    echo "📘 Converting ${READABLE_SOURCE} → Word..."
    show_step 2 3 "Preparing Word folder..."
    mkdir -p "$(dirname "$DOCX")"
    show_step 3 3 "Running pandoc (${READABLE_SOURCE} → Word)..."
    DOCX_ARGS=("--from=${SOURCE_FORMAT}")
    if [[ -f "$REFERENCE_DOC" ]]; then
      DOCX_ARGS+=("--reference-doc=$REFERENCE_DOC")
    fi
    if [[ "$TEXT_ONLY" == "1" ]]; then
      DOCX_ARGS+=("--wrap=none")
      echo "🧰 Text-only mode enabled (large file fallback)."
    fi
    run_conversion "to-docx" "$MD" "$DOCX" "${DOCX_ARGS[@]}"
    ;;
  to-pptx)
    SOURCE_FORMAT=$(detect_text_format "$MD")
    lint_source_file "$MD" "$SOURCE_FORMAT"
    READABLE_SOURCE=$(format_label "$SOURCE_FORMAT")
    PPTX_TARGET="${OUTPUT_OVERRIDE:-$(replace_extension "$MD" pptx)}"
    echo "📽️  Converting ${READABLE_SOURCE} → PowerPoint..."
    show_step 2 3 "Preparing slide deck folder..."
    mkdir -p "$(dirname "$PPTX_TARGET")"
    show_step 3 3 "Running pandoc (${READABLE_SOURCE} → PPTX)..."
    PPTX_ARGS=("--from=${SOURCE_FORMAT}" "--to=pptx")
    if [[ -f "$REFERENCE_PPTX" ]]; then
      PPTX_ARGS+=("--reference-doc=$REFERENCE_PPTX")
    fi
    if [[ "$TEXT_ONLY" == "1" ]]; then
      PPTX_ARGS+=("--wrap=none")
      echo "🧰 Text-only mode enabled (large file fallback)."
    fi
    run_conversion "to-pptx" "$MD" "$PPTX_TARGET" "${PPTX_ARGS[@]}"
    ;;
  to-pdf)
    SOURCE_FORMAT=$(detect_text_format "$MD")
    lint_source_file "$MD" "$SOURCE_FORMAT"
    PDF_TARGET="${OUTPUT_OVERRIDE:-$(replace_extension "$MD" pdf)}"
    show_step 2 3 "Preparing PDF folder..."
    mkdir -p "$(dirname "$PDF_TARGET")"
    if ! resolve_pdf_engine; then
      echo "❌ No PDF engine (weasyprint/wkhtmltopdf/prince) found. Install one or set DOCSYNC_PDF_ENGINE." >&2
      exit 1
    fi
    echo "📄 Building PDF via pandoc ($PDF_ENGINE)..."
    PDF_ARGS=("--from=${SOURCE_FORMAT}" "--pdf-engine=$PDF_ENGINE" "--standalone" "--css=$DEFAULT_PDF_CSS")
    run_conversion "to-pdf" "$MD" "$PDF_TARGET" "${PDF_ARGS[@]}"
    ;;
  to-html)
    SOURCE_FORMAT=$(detect_text_format "$MD")
    lint_source_file "$MD" "$SOURCE_FORMAT"
    HTML_TARGET="${OUTPUT_OVERRIDE:-$(replace_extension "$MD" html)}"
    show_step 2 3 "Preparing HTML folder..."
    mkdir -p "$(dirname "$HTML_TARGET")"
    READABLE_SOURCE=$(format_label "$SOURCE_FORMAT")
    echo "🌐 Exporting ${READABLE_SOURCE} → HTML..."
    HTML_ARGS=("--from=${SOURCE_FORMAT}" "-t" "html5" "--standalone")
    [[ -f "$DEFAULT_HTML_CSS" ]] && HTML_ARGS+=("--css=$DEFAULT_HTML_CSS")
    run_conversion "to-html" "$MD" "$HTML_TARGET" "${HTML_ARGS[@]}"
    ;;
  auto)
    if [[ -f "$DOCX" && -f "$MD" ]]; then
      if [[ "$DOCX" -nt "$MD" ]]; then
        lint_source_file "$DOCX" "docx"
        echo "🔍 Word file is newer, converting to Markdown..."
        show_step 2 3 "Preparing Markdown folder..."
        mkdir -p "$(dirname "$MD")"
        show_step 3 3 "Running pandoc (Word → Markdown)..."
        run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
      else
        SOURCE_FORMAT=$(detect_text_format "$MD")
        lint_source_file "$MD" "$SOURCE_FORMAT"
        READABLE_SOURCE=$(format_label "$SOURCE_FORMAT")
        echo "🔍 ${READABLE_SOURCE} file is newer, converting to Word..."
        show_step 2 3 "Preparing Word folder..."
        mkdir -p "$(dirname "$DOCX")"
        show_step 3 3 "Running pandoc (Markdown → Word)..."
        DOCX_ARGS=("--from=${SOURCE_FORMAT}")
        if [[ -f "$REFERENCE_DOC" ]]; then
          DOCX_ARGS+=("--reference-doc=$REFERENCE_DOC")
        fi
        run_conversion "auto-to-docx" "$MD" "$DOCX" "${DOCX_ARGS[@]}"
      fi
    elif [[ -f "$DOCX" ]]; then
      lint_source_file "$DOCX" "docx"
      echo "📄 Found Word file, converting to Markdown..."
      show_step 2 3 "Preparing Markdown folder..."
      mkdir -p "$(dirname "$MD")"
      show_step 3 3 "Running pandoc (Word → Markdown)..."
      run_conversion "auto-to-md" "$DOCX" "$MD" -t gfm
    elif [[ -f "$MD" ]]; then
      SOURCE_FORMAT=$(detect_text_format "$MD")
      lint_source_file "$MD" "$SOURCE_FORMAT"
      READABLE_SOURCE=$(format_label "$SOURCE_FORMAT")
      echo "📘 Found ${READABLE_SOURCE} file, converting to Word..."
      show_step 2 3 "Preparing Word folder..."
      mkdir -p "$(dirname "$DOCX")"
      show_step 3 3 "Running pandoc (Markdown → Word)..."
      DOCX_ARGS=("--from=${SOURCE_FORMAT}")
      if [[ -f "$REFERENCE_DOC" ]]; then
        DOCX_ARGS+=("--reference-doc=$REFERENCE_DOC")
      fi
      run_conversion "auto-to-docx" "$MD" "$DOCX" "${DOCX_ARGS[@]}"
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
