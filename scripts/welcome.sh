#!/usr/bin/env bash
# First-run experience

WELCOME_FILE="$HOME/.docx-sync-welcome-shown"

if [[ -f "$WELCOME_FILE" ]]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}__      __           _           _           ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}\ \    / /__ _ _ __ | |__   ___ | |__ ${GREEN}🚀${BLUE}║${NC}"
echo -e "${BLUE}║${NC}    ${CYAN} \ \/\/ / _ \ '_ \| '_ \ / _ \| '_ \ ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     ${CYAN} \_/\_/\___/ .__/|_.__/ \___/|_.__/ ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}              ${CYAN}|_|    Word ↔ Markdown Sync ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}You’re about to edit Word files like native Markdown projects.${NC}"
echo ""

echo -e "${YELLOW}How it works:${NC}"
echo -e "  1) ${GREEN}Drop${NC} any .docx into ${CYAN}${DOCS_DIR}${NC}"
echo -e "  2) ${GREEN}Run${NC} ${CYAN}dsync${NC} and pick your document"
echo -e "  3) ${GREEN}Choose${NC} an action: convert, export, auto-sync, or watch mode"
echo -e "  4) ${GREEN}Edit${NC} Markdown in VS Code and let the tool keep Word up to date"
echo ""

echo -e "${YELLOW}Need a tour?${NC}"
echo "  • QUICKSTART.md    → step-by-step walkthrough"
echo "  • VISUAL-GUIDE.md  → screenshots of every action"
echo "  • Beginner wizard  → option 9 inside the menu"
echo ""

echo -e "${GREEN}Pro tips:${NC}"
echo "  • Keep dsync running for quick one-off conversions"
echo "  • Use watch mode for live exports while editing"
echo "  • Ask Claude/Desktop Commander to automate repetitive tasks"
echo ""

echo -e "${BLUE}You're all set — let's sync some docs!${NC}"
echo ""
read -p "Press Enter to continue..."

touch "$WELCOME_FILE"
