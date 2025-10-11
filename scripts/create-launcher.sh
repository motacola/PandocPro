#!/usr/bin/env bash
# Create desktop launcher for easy access

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

DESKTOP="$HOME/Desktop"
LAUNCHER="$DESKTOP/Word-Markdown-Sync.command"

cat > "$LAUNCHER" << 'EOF'
#!/usr/bin/env bash
cd ~/Documents/docx-md-sync && ./scripts/menu.sh
EOF

chmod +x "$LAUNCHER"

echo ""
echo -e "${GREEN}✅ Desktop launcher created!${NC}"
echo ""
echo -e "${BLUE}You can now:${NC}"
echo "  1. Double-click 'Word-Markdown-Sync.command' on your Desktop"
echo "  2. Or type 'dsync' in any terminal"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Drag the launcher to your Dock for even faster access!"
echo ""
