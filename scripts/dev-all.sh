#!/usr/bin/env bash
set -euo pipefail

# Runs the web UI and watcher together for quick testing.
# Usage:
#   MODE=to-docx DOCX_FILE=docs/presentation.docx MD_FILE=docs/presentation.md bash scripts/dev-all.sh
#   MODE=to-pptx bash scripts/dev-all.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${MODE:-to-docx}"
DOCX_FILE="${DOCX_FILE:-docs/presentation.docx}"
MD_FILE="${MD_FILE:-docs/presentation.md}"
QUIET_FLAG="${QUIET:-}"

case "$MODE" in
  to-docx|to-pptx|to-pdf|to-html) ;;
  *) echo "❌ Unknown MODE=$MODE (use to-docx|to-pptx|to-pdf|to-html)"; exit 1 ;;
esac

ui_pid=""
watch_pid=""

cleanup() {
  [[ -n "$watch_pid" ]] && kill "$watch_pid" 2>/dev/null || true
  [[ -n "$ui_pid" ]] && kill "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT

PORT="${DSYNC_UI_PORT:-4174}"

if lsof -i tcp:"$PORT" >/dev/null 2>&1; then
  echo "❌ Port $PORT is in use. Set DSYNC_UI_PORT to another port (e.g., 5174) and retry."
  exit 1
fi

echo "🌐 Starting drag-and-drop UI on http://localhost:${PORT} ..."
DSYNC_UI_PORT="$PORT" node ui-server/server.js >/tmp/pandocpro-ui.log 2>&1 &
ui_pid=$!

echo "👀 Starting watcher (mode=${MODE}, md=${MD_FILE}, docx=${DOCX_FILE}) ..."
QUIET_ARG=""
[[ -n "$QUIET_FLAG" ]] && QUIET_ARG="--quiet"
DOCX_FILE="$DOCX_FILE" MD_FILE="$MD_FILE" node watch-md.js --mode="$MODE" $QUIET_ARG &
watch_pid=$!

cat <<EOF
✅ Services launched:
 - UI: http://localhost:${PORT}  (logs: /tmp/pandocpro-ui.log)
 - Watcher: mode=${MODE}, MD=${MD_FILE}, DOCX=${DOCX_FILE}

Press Ctrl+C to stop both.
EOF

wait
