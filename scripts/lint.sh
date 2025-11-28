#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "⚠️  shellcheck not installed; skipping shell lint. Install via 'brew install shellcheck'."
  exit 0
fi

echo "🔍 Running shellcheck..."
shellcheck scripts/docx-sync.sh scripts/menu.sh scripts/smoke.sh scripts/lint.sh
echo "✅ Shellcheck passed."
