#!/usr/bin/env bash
# Interactive menu for Word ↔ Markdown sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Show welcome message on first run
"$SCRIPT_DIR/welcome.sh"

# Colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Word ↔ Markdown Sync Menu           ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# List all .docx files in docs/ (including subfolders)
DOCX_FILES=()
while IFS= read -r file; do
    DOCX_FILES+=("$file")
done < <(find docs -type f -iname '*.docx' -print 2>/dev/null | sort)

if [[ ${#DOCX_FILES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}No .docx files found in docs/ folder${NC}"
    echo ""
    echo "Place your Word documents in the docs/ folder and try again."
    exit 1
fi

# Show available documents
echo -e "${GREEN}Available documents:${NC}"
select_idx=1
for file in "${DOCX_FILES[@]}"; do
    display_path="${file#docs/}"
    echo "  $select_idx) $display_path"
    ((select_idx++))
done
echo ""

# Get user selection
read -p "Select document number (or 'q' to quit): " doc_choice
if [[ "$doc_choice" == "q" ]]; then
    exit 0
fi

case "$doc_choice" in
    ''|*[!0-9]*)
        echo -e "${RED}Invalid selection${NC}"
        exit 1
        ;;
esac

doc_index=$((doc_choice - 1))
if (( doc_index < 0 || doc_index >= ${#DOCX_FILES[@]} )); then
    echo -e "${RED}Invalid selection${NC}"
    exit 1
fi

SELECTED_DOCX="${DOCX_FILES[$doc_index]}"
SELECTED_MD="${SELECTED_DOCX%.docx}.md"

echo ""
echo -e "${GREEN}Selected: $(basename "$SELECTED_DOCX")${NC}"
echo ""
echo "What would you like to do?"
echo ""
echo "  1) 📄 Convert to Markdown (for editing)"
echo "  2) 📘 Export to Word (from markdown)"
echo "  3) 🔄 Auto-sync (newest file wins)"
echo "  4) 👀 Watch mode (auto-export on save)"
echo "  5) ✏️  Edit markdown in VS Code"
echo "  6) 📂 Open Word document"
echo ""
read -p "Choose action (1-6): " action

case $action in
    1)
        echo -e "${BLUE}Converting to Markdown...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        echo -e "${GREEN}✓ Done! Edit: $SELECTED_MD${NC}"
        ;;
    2)
        echo -e "${BLUE}Exporting to Word...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-docx
        echo -e "${GREEN}✓ Done! Open: $SELECTED_DOCX${NC}"
        ;;
    3)
        echo -e "${BLUE}Auto-syncing...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" auto
        echo -e "${GREEN}✓ Done!${NC}"
        ;;
    4)
        echo -e "${BLUE}Starting watch mode...${NC}"
        echo -e "${YELLOW}Watching $SELECTED_MD for changes${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        MD_FILE="$SELECTED_MD" DOCX_FILE="$SELECTED_DOCX" npm run watch
        ;;
    5)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo -e "${YELLOW}Markdown file doesn't exist. Converting first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        echo -e "${BLUE}Opening in VS Code...${NC}"
        open -a "Visual Studio Code" "$SELECTED_MD"
        ;;
    6)
        echo -e "${BLUE}Opening Word document...${NC}"
        open "$SELECTED_DOCX"
        ;;
    *)
        echo -e "${RED}Invalid action${NC}"
        exit 1
        ;;
esac
