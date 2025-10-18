#!/usr/bin/env bash
# Interactive menu for Word ↔ Markdown sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Show welcome message on first run
"$SCRIPT_DIR/welcome.sh"

HISTORY_FILE="$PROJECT_ROOT/logs/history.log"
BACKUP_DIR="$PROJECT_ROOT/backups"

sanitize_log_field() {
    local value="${1//$'\r'/ }"
    value="${value//$'\n'/ }"
    value="${value//|/\/}"
    value="$(echo "$value" | sed 's/[[:space:]]\{2,\}/ /g')"
    echo "$value"
}

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
if [[ "$SELECTED_DOCX" =~ \.[dD][oO][cC][xX]$ ]]; then
    SELECTED_MD="${SELECTED_DOCX%.[dD][oO][cC][xX]}.md"
else
    SELECTED_MD="${SELECTED_DOCX}.md"
fi

echo ""
echo -e "${GREEN}Selected: $(basename "$SELECTED_DOCX")${NC}"
echo ""
echo "What would you like to do?"
echo ""
echo "  1) 📄 Make a Markdown copy so I can edit here"
echo "  2) 📘 Create a fresh Word file from my Markdown"
echo "  3) 🔄 Keep Word and Markdown matched automatically"
echo "  4) 👀 Live update Word while I edit (watch mode)"
echo "  5) ✏️  Open the Markdown in VS Code"
echo "  6) 📂 Open this file in Microsoft Word"
echo "  7) 📜 Show recent activity"
echo "  8) ↩️  Undo the last thing I did"
echo "  9) 🧭 Step-by-step helper (beginner mode)"
echo " 10) 🤖 Pick which AI helper to use"
echo ""
read -p "Choose action (1-10): " action

case $action in
    1)
        echo -e "${BLUE}Creating an easy-to-edit Markdown copy...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        echo -e "${GREEN}✓ All set! Open $SELECTED_MD to start editing.${NC}"
        ;;
    2)
        echo -e "${BLUE}Building a polished Word file from your Markdown...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-docx
        echo -e "${GREEN}✓ Done! Open $SELECTED_DOCX in Word to review.${NC}"
        ;;
    3)
        echo -e "${BLUE}Checking which version is newer and syncing...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" auto
        echo -e "${GREEN}✓ Both copies now match.${NC}"
        ;;
    4)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo -e "${YELLOW}No Markdown copy yet—creating one for you first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        if ! command -v npm >/dev/null 2>&1; then
            echo -e "${RED}Live updates need Node.js (npm) to be installed.${NC}"
            echo -e "${YELLOW}Tip:${NC} Install it with: brew install node"
            exit 1
        fi
        if [[ ! -d node_modules ]]; then
            echo -e "${BLUE}Downloading a few helper packages (one-time step)...${NC}"
            if ! npm install; then
                echo -e "${RED}npm install failed. Please check your internet connection and try again.${NC}"
                exit 1
            fi
        fi
        echo -e "${BLUE}Live updates are running!${NC}"
        echo -e "${YELLOW}Every time you save $SELECTED_MD, the Word file updates automatically.${NC}"
        echo -e "${YELLOW}Leave this window open. Press Ctrl+C to stop when you’re finished.${NC}"
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
    7)
        if [[ ! -f "$HISTORY_FILE" ]]; then
            echo -e "${YELLOW}No history found yet.${NC}"
        else
            echo -e "${GREEN}Recent conversions:${NC}"
            tail -n 10 "$HISTORY_FILE" | while IFS='|' read -r ts mode source target status duration warnings backup note; do
                [[ -z "$ts" ]] && continue
                display_target="$(basename "$target")"
                display_source="$(basename "$source")"
                summary="${ts} • ${mode} • ${status}"
                if [[ -n "$duration" ]]; then
                    summary+=" • ${duration}s"
                fi
                if [[ "$warnings" != "none" && -n "$warnings" ]]; then
                    summary+=" • ${warnings}"
                fi
                if [[ -n "$note" && "$note" != "completed" ]]; then
                    summary+=" • ${note}"
                fi
                summary+=" • ${display_source} → ${display_target}"
                echo "  • $summary"
            done
        fi
        ;;
    8)
        if [[ ! -f "$HISTORY_FILE" ]]; then
            echo -e "${YELLOW}No history to undo.${NC}"
            exit 0
        fi
        last_entry="$(tail -n 1 "$HISTORY_FILE")"
        if [[ -z "$last_entry" ]]; then
            echo -e "${YELLOW}History file is empty.${NC}"
            exit 0
        fi
        IFS='|' read -r ts mode source target status duration warnings backup note <<< "$last_entry"
        if [[ "$status" != "success" ]]; then
            echo -e "${YELLOW}Last conversion was not successful; nothing to undo.${NC}"
            exit 0
        fi
        if [[ -n "$backup" && -f "$backup" ]]; then
            if cp "$backup" "$target"; then
                echo -e "${GREEN}Restored previous version from backup:${NC} $target"
                undo_note="undo restored backup"
            else
                echo -e "${RED}Failed to restore backup.${NC}"
                exit 1
            fi
        else
            if [[ -f "$target" ]]; then
                rm "$target"
                echo -e "${GREEN}Removed newly created file:${NC} $target"
                undo_note="undo removed new file"
            else
                echo -e "${YELLOW}No backup available and target missing; nothing to undo.${NC}"
                exit 0
            fi
        fi
        timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        safe_target="$(sanitize_log_field "$target")"
        safe_backup="$(sanitize_log_field "$backup")"
        if [[ -n "$backup" ]]; then
            source_field="$backup"
        else
            source_field="(none)"
        fi
        safe_source="$(sanitize_log_field "$source_field")"
        safe_note="$(sanitize_log_field "$undo_note")"
        printf "%s|undo|%s|%s|success|0|none|%s|%s\n" \
            "$timestamp" "$safe_source" "$safe_target" "$safe_backup" "$safe_note" >> "$HISTORY_FILE"
        ;;
    9)
        echo -e "${BLUE}Starting the beginner-friendly wizard...${NC}"
        ./scripts/guided-sync.sh
        ;;
    10)
        echo -e "${BLUE}Scanning for local LLM runtimes...${NC}"
        ./scripts/configure-llm.sh
        ;;
    *)
        echo -e "${RED}Invalid action${NC}"
        exit 1
        ;;
esac
