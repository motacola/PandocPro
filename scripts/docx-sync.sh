#!/usr/bin/env bash
set -euo pipefail

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

to_md () {
  echo "📄 Converting Word → Markdown..."
  if pandoc "$DOCX" -t gfm -o "$MD"; then
    echo "✅ Success! Wrote: $MD"
  else
    echo "❌ Conversion failed. Is the file valid?" >&2
    exit 1
  fi
}

to_docx () {
  echo "📘 Converting Markdown → Word..."
  if pandoc "$MD" -o "$DOCX"; then
    echo "✅ Success! Wrote: $DOCX"
  else
    echo "❌ Conversion failed. Is the markdown valid?" >&2
    exit 1
  fi
}

if [[ "$MODE" == "to-md" ]]; then
  to_md
  exit 0
elif [[ "$MODE" == "to-docx" ]]; then
  to_docx
  exit 0
fi

# MODE=auto — convert the newest file into the other
if [[ -f "$DOCX" && -f "$MD" ]]; then
  if [[ "$DOCX" -nt "$MD" ]]; then
    echo "🔍 Word file is newer, converting to Markdown..."
    to_md
  else
    echo "🔍 Markdown file is newer, converting to Word..."
    to_docx
  fi
elif [[ -f "$DOCX" ]]; then
  echo "📄 Found Word file, converting to Markdown..."
  to_md
elif [[ -f "$MD" ]]; then
  echo "📘 Found Markdown file, converting to Word..."
  to_docx
else
  echo "❌ Error: Neither $DOCX nor $MD exists" >&2
  echo "💡 Tip: Run 'dsync' for an interactive menu" >&2
  exit 1
fi
