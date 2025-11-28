#!/usr/bin/env bash
# Lightweight smoke checks for docx-md-sync
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "🔍 Running shell syntax checks..."
for script in scripts/docx-sync.sh scripts/menu.sh; do
  if [[ -f "$script" ]]; then
    bash -n "$script"
  fi
done
echo "✅ Shell scripts parsed cleanly."

if ! command -v pandoc >/dev/null 2>&1; then
  echo "❌ pandoc not found. Install via 'brew install pandoc' before running smoke tests."
  exit 1
fi
if ! pandoc --list-output-formats | grep -q '^pptx$'; then
  echo "❌ pandoc PPTX writer not available. Upgrade pandoc to a build with pptx support."
  exit 1
fi

echo "🧪 Checking docx-sync help path..."
./scripts/docx-sync.sh -h >/dev/null
echo "✅ docx-sync help executed."

echo "🧪 Running a one-off PPTX export (temp files)..."
SMOKE_TMP="$(mktemp -d)"
trap 'rm -rf "$SMOKE_TMP"' EXIT
SMOKE_MD="$SMOKE_TMP/smoke.md"
SMOKE_DOCX="$SMOKE_TMP/smoke.docx"
echo -e "# Smoke Test\n\nThis is a smoke check." >"$SMOKE_MD"
./scripts/docx-sync.sh "$SMOKE_DOCX" "$SMOKE_MD" to-pptx "$SMOKE_TMP/smoke.pptx" >/dev/null
[[ -f "$SMOKE_TMP/smoke.pptx" ]] || { echo "❌ PPTX export failed."; exit 1; }
echo "✅ PPTX export succeeded."

echo "🧪 Verifying watcher one-shot export..."
DOCX_FILE="$SMOKE_DOCX" MD_FILE="$SMOKE_MD" node watch-md.js --once >/dev/null
[[ -f "$SMOKE_DOCX" ]] || { echo "❌ Watcher export failed."; exit 1; }
echo "✅ Watcher export succeeded."

echo "🎉 Smoke tests passed."
