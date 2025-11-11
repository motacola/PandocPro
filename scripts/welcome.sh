#!/usr/bin/env bash
# Enhanced first-run welcome experience with ASCII art

WELCOME_FILE="$HOME/.docx-sync-welcome-shown"

if [[ -f "$WELCOME_FILE" ]]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"

# Color palette
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

clear
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}                                                                ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██████╗  █████╗ ███╗   ██╗██████╗  ██████╗  ██████╗${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔═══██╗██╔════╝${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██████╔╝███████║██╔██╗ ██║██║  ██║██║   ██║██║     ${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██╔═══╝ ██╔══██║██║╚██╗██║██║  ██║██║   ██║██║     ${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██║     ██║  ██║██║ ╚████║██████╔╝╚██████╔╝╚██████╗${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝  ╚═════╝${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                                ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${MAGENTA}${BOLD}PRO${NC}                  ${DIM}Word ↔ Markdown Sync${NC}               ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                                ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}${BOLD}🎉 Welcome to PandocPro!${NC}"
echo -e "${DIM}Edit Word documents like native Markdown projects — no coding required.${NC}"
echo ""
echo ""

echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}${BOLD}  HOW IT WORKS${NC}"
echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}1${NC} 📁 ${BOLD}Drop${NC} any .docx file into  ${CYAN}${DOCS_DIR}${NC}"
echo -e "       ${DIM}└─ Organize them in subfolders if you like!${NC}"
echo ""
echo -e "  ${CYAN}2${NC} ⚡ ${BOLD}Run${NC} ${GREEN}${BOLD}dsync${NC} in your terminal"
echo -e "       ${DIM}└─ A friendly menu appears with your documents${NC}"
echo ""
echo -e "  ${CYAN}3${NC} ✨ ${BOLD}Choose${NC} what you need:"
echo -e "       ${DIM}• Convert to Markdown for easy editing${NC}"
echo -e "       ${DIM}• Export back to Word for sharing${NC}"
echo -e "       ${DIM}• Auto-sync (keeps both files matched)${NC}"
echo -e "       ${DIM}• Live watch mode (instant updates!)${NC}"
echo ""
echo -e "  ${CYAN}4${NC} ✏️  ${BOLD}Edit${NC} in VS Code, commit to Git, use AI tools"
echo -e "       ${DIM}└─ Work the way developers work, with Word docs${NC}"
echo ""
echo ""

echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}${BOLD}  GETTING STARTED${NC}"
echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}📚 Complete Guides:${NC}"
echo -e "     • ${BOLD}START-HERE.md${NC}      ${DIM}→ New user? Start here!${NC}"
echo -e "     • ${BOLD}QUICKSTART.md${NC}      ${DIM}→ Step-by-step walkthrough${NC}"
echo -e "     • ${BOLD}VISUAL-GUIDE.md${NC}    ${DIM}→ Screenshots of every action${NC}"
echo ""
echo -e "  ${BLUE}🧭 Beginner Wizard:${NC}"
echo -e "     • Run ${GREEN}dsync${NC} and choose ${YELLOW}option 9${NC}"
echo -e "       ${DIM}└─ Interactive helper walks you through everything${NC}"
echo ""
echo -e "  ${CYAN}🤖 AI Power User?${NC}"
echo -e "     • Ask ${BOLD}Claude Desktop${NC} to convert, edit, and export docs"
echo -e "     • See ${BOLD}MCP-INTEGRATION.md${NC} for automation setup"
echo ""
echo ""

echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  PRO TIPS${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}💡${NC} Keep ${GREEN}dsync${NC} running for quick one-off conversions"
echo -e "  ${GREEN}💡${NC} Use ${YELLOW}watch mode${NC} for live exports while editing"
echo -e "  ${GREEN}💡${NC} Both .docx and .md files are ${CYAN}Git-friendly${NC}"
echo -e "  ${GREEN}💡${NC} Let Word handle complex formatting, Markdown for content"
echo -e "  ${GREEN}💡${NC} Automate repetitive tasks with Claude/MCP tools"
echo ""
echo ""

echo -e "${GREEN}${BOLD}✅ You're all set — ready to sync some docs!${NC}"
echo ""
echo -e "${DIM}Tip: Type ${GREEN}dsync${NC}${DIM} anytime to access the menu${NC}"
echo ""

read -p "Press Enter to launch the menu..."

touch "$WELCOME_FILE"
