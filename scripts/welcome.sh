#!/usr/bin/env bash
# First-run experience

WELCOME_FILE="$HOME/.docx-sync-welcome-shown"

if [[ -f "$WELCOME_FILE" ]]; then
    exit 0
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                   ║${NC}"
echo -e "${BLUE}║       Welcome to Word ↔ Markdown Sync! 🚀        ║${NC}"
echo -e "${BLUE}║                                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✨ What you can do:${NC}"
echo ""
echo "  📄 Edit Word documents in VS Code"
echo "  🔄 Auto-sync between .docx and .md"
echo "  👀 Watch mode for live updates"
echo "  🤖 Use AI tools to improve your content"
echo ""
echo -e "${YELLOW}📍 Quick tips:${NC}"
echo ""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"

echo "  1. Put your Word docs in: $DOCS_DIR"
echo "  2. Run this menu anytime with: ${GREEN}dsync${NC}"
echo "  3. Check QUICKSTART.md for detailed guide"
echo ""
echo -e "${BLUE}Let's get started!${NC}"
echo ""
read -p "Press Enter to continue..."

touch "$WELCOME_FILE"
