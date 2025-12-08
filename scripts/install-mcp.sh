#!/usr/bin/env bash
# One-step MCP installer: copies docSync tools into ~/mcp/tools

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="$HOME/mcp/tools"
TARGET_FILE="$TARGET_DIR/docsync.yaml"

echo "🔗 Installing docSync MCP tools..."
echo "Project root: $PROJECT_ROOT"
echo "Target file : $TARGET_FILE"

mkdir -p "$TARGET_DIR"
cp "$PROJECT_ROOT/mcp/docsync.yaml" "$TARGET_FILE"

cat <<'EOF'
✅ Copied mcp/docsync.yaml into ~/mcp/tools.

Next steps:
1) Restart/reload your MCP client (Claude Desktop, Context7, VS Code MCP, etc.).
2) If your client launches outside this repo, set:
   export PROJECT_ROOT="/absolute/path/to/docx-md-sync"
   (Add it to your shell profile if needed.)

Ask your client to run a docSync command, e.g.:
  "What documents are available?"
EOF
