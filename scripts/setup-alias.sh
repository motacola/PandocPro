#!/usr/bin/env bash
# Setup helper - adds convenient aliases to your shell

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Word ↔ Markdown Setup                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Detect shell
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
else
    echo -e "${YELLOW}Unsupported shell: $SHELL${NC}"
    echo "You can manually add the alias to your shell config."
    exit 1
fi

echo -e "${GREEN}Detected shell config: $SHELL_RC${NC}"
echo ""

# Check if alias already exists
if grep -q "alias dsync=" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}Alias 'dsync' already exists in $SHELL_RC${NC}"
    echo ""
    read -p "Replace it? (y/n): " replace
    if [[ "$replace" != "y" ]]; then
        echo "Skipping alias setup"
        exit 0
    fi
    # Remove old alias
    sed -i.bak '/alias dsync=/d' "$SHELL_RC"
fi

# Add alias
echo "" >> "$SHELL_RC"
echo "# Word ↔ Markdown sync tool" >> "$SHELL_RC"
echo "alias dsync='~/Documents/docx-md-sync/sync'" >> "$SHELL_RC"

echo -e "${GREEN}✓ Alias added to $SHELL_RC${NC}"
echo ""
echo -e "${BLUE}Usage:${NC}"
echo "  Just type: ${GREEN}dsync${NC}"
echo ""
echo -e "${YELLOW}To use it now, run:${NC}"
echo "  source $SHELL_RC"
echo ""
echo -e "  ${GREEN}Or simply open a new terminal window${NC}"
