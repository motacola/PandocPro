#!/usr/bin/env bash
# Interactive menu for Word ↔ Markdown sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Show welcome message on first run
"$SCRIPT_DIR/welcome.sh"

HISTORY_FILE="$PROJECT_ROOT/logs/history.log"
LLM_CONFIG="$PROJECT_ROOT/config/llm-selection.json"
MCP_CONFIG="$HOME/mcp/tools/docsync.yaml"

sanitize_log_field() {
    local value="${1//$'\r'/ }"
    value="${value//$'\n'/ }"
    value="${value//|/\/}"
    value="$(printf '%s\n' "$value" | tr -s '[:space:]' ' ')"
    echo "$value"
}

show_history_preview() {
    local limit="${1:-5}"
    if [[ ! -f "$HISTORY_FILE" ]]; then
        echo -e "${DIM}No conversions logged yet.${NC}"
        return
    fi
    if command -v tac >/dev/null 2>&1; then
        local reader=(tac "$HISTORY_FILE")
    else
        local reader=(perl -e 'print reverse <>' "$HISTORY_FILE")
    fi
    local shown=0
    echo -e "${MAGENTA}${BOLD}Recent conversions:${NC}"
    while IFS='|' read -r ts mode source target status duration warnings backup note; do
        [[ -z "$ts" ]] && continue
        local status_icon="${RED}✗${NC}"
        [[ "$status" == "success" ]] && status_icon="${GREEN}✓${NC}"
        local base_src
        base_src="$(basename "$source")"
        local base_target
        base_target="$(basename "$target")"
        local summary="  ${DIM}${ts}${NC} • ${CYAN}${mode}${NC} • ${status_icon}"
        if [[ -n "$duration" ]]; then
            summary+=" • ${duration}s"
        fi
        summary+=" • ${base_src} → ${base_target}"
        if [[ "$warnings" != "none" && -n "$warnings" ]]; then
            summary+=" • ${YELLOW}⚠${NC} ${warnings}"
        fi
        echo -e "$summary"
        ((shown++))
        (( shown >= limit )) && break
    done < <("${reader[@]}")
    if (( shown == 0 )); then
        echo -e "${DIM}No conversions logged yet.${NC}"
    fi
}

# Colors for pretty output (fall back to plain text when not a TTY)
if [[ -t 1 && -n "${TERM:-}" ]]; then
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    MAGENTA='\033[0;35m'
    BOLD='\033[1m'
    DIM='\033[2m'
    NC='\033[0m' # No Color
else
    GREEN=''; BLUE=''; CYAN=''; YELLOW=''; RED=''; MAGENTA=''; BOLD=''; DIM=''; NC=''
fi

get_llm_status() {
    if [[ ! -f "$LLM_CONFIG" ]]; then
        echo "AI helper: not configured (run ./scripts/configure-llm.sh)"
        return
    fi
    local label
    label="$(node -e "const fs=require('fs');try{const d=JSON.parse(fs.readFileSync('$LLM_CONFIG','utf8'));const provider=(d.provider||'LLM');const model=(d.model||'');const name=(d.displayName||provider);console.log([name, model].filter(Boolean).join(' • '));}catch(e){process.exit(1);} " 2>/dev/null || true)"
    if [[ -z "$label" ]]; then
        echo "AI helper: configured (unable to read details)"
    else
        echo "AI helper: $label"
    fi
}

get_mcp_status() {
    if [[ -f "$MCP_CONFIG" ]]; then
        echo "MCP tools: ready (docsync.yaml found)"
    else
        echo "MCP tools: not installed (run ./scripts/install-mcp.sh)"
    fi
}

normalize_doc_path() {
    local raw="$1"
    local cleaned="${raw//\\/\/}"
    if [[ "$cleaned" == "$PROJECT_ROOT"/* ]]; then
        cleaned="${cleaned#"$PROJECT_ROOT"/}"
    fi
    echo "$cleaned"
}

derive_md_path() {
    local doc_path="$1"
    if [[ "$doc_path" =~ \.[dD][oO][cC][xX]$ ]]; then
        echo "${doc_path%.[dD][oO][cC][xX]}.md"
    else
        echo "${doc_path}.md"
    fi
}

find_doc_index() {
    local search="$1"
    local entry
    for entry in "${DOC_INDEX_LOOKUP[@]}"; do
        IFS='|' read -r path type idx <<< "$entry"
        if [[ "$path" == "$search" ]]; then
            echo "$idx"
            return 0
        fi
    done
    return 1
}

flush_pending_newline() {
    # Clear buffered newline characters so the next prompt behaves predictably.
    while IFS= read -rsn1 -t 0 discard; do
        if [[ "$discard" == $'\n' ]]; then
            break
        fi
    done
}

prompt_action_choice() {
    local prompt="$1"
    ACTION_SELECTION=""
    if [[ -t 0 ]]; then
        printf "%b" "$prompt"
        if ! IFS= read -rsn1 key; then
            echo ""
            read -r ACTION_SELECTION || ACTION_SELECTION=""
            return
        fi
        if [[ "$key" == $'\n' ]]; then
            echo ""
            read -r ACTION_SELECTION || ACTION_SELECTION=""
            return
        fi
        echo ""
        case "$key" in
            [1-9])
                ACTION_SELECTION="$key"
                flush_pending_newline
                echo -e "${DIM}Shortcut ${ACTION_SELECTION} selected${NC}"
                return
                ;;
            0)
                ACTION_SELECTION="10"
                flush_pending_newline
                echo -e "${DIM}Shortcut 0 jumps to option 10 (AI helper)${NC}"
                return
                ;;
            x|X)
                ACTION_SELECTION="pptx"
                flush_pending_newline
                echo -e "${DIM}Shortcut X → Export PPTX${NC}"
                return
                ;;
            k|K)
                ACTION_SELECTION="keynote"
                flush_pending_newline
                echo -e "${DIM}Shortcut K → Export and open in Keynote${NC}"
                return
                ;;
            m|M)
                ACTION_SELECTION="mcp-install"
                flush_pending_newline
                echo -e "${DIM}Shortcut M → Install MCP tools${NC}"
                return
                ;;
            p|P)
                ACTION_SELECTION="pdf"
                flush_pending_newline
                echo -e "${DIM}Shortcut P → Export PDF${NC}"
                return
                ;;
            h|H)
                ACTION_SELECTION="html"
                flush_pending_newline
                echo -e "${DIM}Shortcut H → Export HTML preview${NC}"
                return
                ;;
            f|F)
                ACTION_SELECTION="faq"
                flush_pending_newline
                echo -e "${DIM}Opening interactive FAQ...${NC}"
                return
                ;;
            q|Q)
                ACTION_SELECTION="q"
                flush_pending_newline
                return
                ;;
            *)
                printf "%s" "$key"
                read -r remainder || remainder=""
                ACTION_SELECTION="$key$remainder"
                return
                ;;
        esac
    else
        printf "%b" "$prompt"
        read -r ACTION_SELECTION || ACTION_SELECTION=""
    fi
}

if [[ -t 1 && -n "${TERM:-}" ]]; then
    clear
fi
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}                                                      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██████╗ ██████╗  ██████╗ ${NC}                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██╔══██╗██╔══██╗██╔═══██╗${NC}  ${MAGENTA}${BOLD}PandocPro${NC}              ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██████╔╝██████╔╝██║   ██║${NC}                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██╔═══╝ ██╔══██╗██║   ██║${NC}  ${DIM}Word ↔ Markdown${NC}       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}██║     ██║  ██║╚██████╔╝${NC}                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}   ${CYAN}╚═╝     ╚═╝  ╚═╝ ╚═════╝ ${NC}                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}                                                      ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# List all .docx files in docs/ (including subfolders)
DOC_ENTRIES=()
while IFS= read -r file; do
    lower_ext="${file##*.}"
    lower_ext="$(printf '%s' "$lower_ext" | tr '[:upper:]' '[:lower:]')"
    case "$lower_ext" in
        docx)
            DOC_ENTRIES+=("$file|docx")
            ;;
        html|htm)
            DOC_ENTRIES+=("$file|html")
            ;;
    esac
done < <(find docs -type f \( -iname '*.docx' -o -iname '*.html' -o -iname '*.htm' \) -print 2>/dev/null | sort)

if [[ ${#DOC_ENTRIES[@]} -eq 0 ]]; then
    echo -e "${YELLOW}📂 No .docx or .html files found in docs/ folder${NC}"
    echo ""
    echo -e "${DIM}Place your Word documents in the ${CYAN}docs/${DIM} folder and try again.${NC}"
    echo -e "${DIM}Tip: You can organize them in subfolders too!${NC}"
    exit 1
fi

total_docs=${#DOC_ENTRIES[@]}

# Show available documents
echo -e "${GREEN}${BOLD}📄 Available Documents:${NC}"
echo ""
DOC_INDEX_LOOKUP=()
select_idx=1
for entry in "${DOC_ENTRIES[@]}"; do
    path="${entry%%|*}"
    type="${entry##*|}"
    display_path="${path#docs/}"
    icon="📄"
    if [[ "$type" == "html" ]]; then
        icon="🌐"
    fi
    echo -e "  ${CYAN}$select_idx${NC}) ${icon} ${display_path}"
    DOC_INDEX_LOOKUP+=("$path|$type|$select_idx")
    ((select_idx++))
done
echo ""

RECENT_QUICK=()
if [[ -f "$HISTORY_FILE" && ${#DOC_ENTRIES[@]} -gt 0 ]]; then
    if command -v tac >/dev/null 2>&1; then
        HISTORY_READER=(tac "$HISTORY_FILE")
    else
        HISTORY_READER=(perl -e 'print reverse <>' "$HISTORY_FILE")
    fi
    RECENT_SEEN=()
    while IFS='|' read -r ts mode source target status duration warnings backup note; do
        [[ -z "$ts" ]] && continue
        doc_candidate=""
        if [[ "$mode" == *"to-docx"* ]]; then
            doc_candidate="$target"
        elif [[ "$mode" == *"to-md"* ]]; then
            doc_candidate="$source"
        fi
        if [[ -z "$doc_candidate" ]]; then
            if [[ "$target" =~ \.[dD][oO][cC][xX]$ ]]; then
                doc_candidate="$target"
            elif [[ "$source" =~ \.[dD][oO][cC][xX]$ ]]; then
                doc_candidate="$source"
            fi
        fi
        [[ -z "$doc_candidate" ]] && continue
        doc_candidate="$(normalize_doc_path "$doc_candidate")"
        duplicate=0
        if (( ${#RECENT_SEEN[@]} )); then
            for seen in "${RECENT_SEEN[@]}"; do
                if [[ "$seen" == "$doc_candidate" ]]; then
                    duplicate=1
                    break
                fi
            done
        fi
        (( duplicate == 1 )) && continue
        doc_index="$(find_doc_index "$doc_candidate")"
        if [[ -z "$doc_index" ]]; then
            continue
        fi
        RECENT_SEEN+=("$doc_candidate")
        RECENT_QUICK+=("$doc_candidate|$doc_index|$ts")
        if [[ ${#RECENT_QUICK[@]} -ge 3 ]]; then
            break
        fi
    done < <("${HISTORY_READER[@]}")
    unset RECENT_SEEN
fi

if [[ ${#RECENT_QUICK[@]} -gt 0 ]]; then
    echo -e "${GREEN}${BOLD}⭐ Quick picks:${NC}"
    for entry in "${RECENT_QUICK[@]}"; do
        IFS='|' read -r doc_path doc_index doc_ts <<< "$entry"
        display_name="${doc_path#docs/}"
        display_name="${display_name#./}"
        if [[ -z "$display_name" ]]; then
            display_name="$doc_path"
        fi
        echo -e "  ${CYAN}$doc_index${NC}) ${display_name} ${DIM}(last run ${doc_ts})${NC}"
    done
    echo ""
fi

# Get user selection
read -r -p "$(echo -e "${CYAN}Select document number${NC} ${DIM}(or 'q' to quit)${NC}: ")" doc_choice
if [[ "$doc_choice" == "q" ]]; then
    exit 0
fi

case "$doc_choice" in
    ''|*[!0-9]*)
        echo -e "${RED}❌ Invalid selection${NC}"
        echo -e "${YELLOW}💡 Tip:${NC} Enter a number between 1 and ${CYAN}$total_docs${NC}, or press ${CYAN}q${NC} to exit."
        exit 1
        ;;
esac

doc_index=$((doc_choice - 1))
if (( doc_index < 0 || doc_index >= ${#DOC_ENTRIES[@]} )); then
    echo -e "${RED}❌ Invalid selection${NC}"
    echo -e "${YELLOW}💡 Tip:${NC} Pick a number you see in the list above, or press ${CYAN}q${NC} to cancel."
    exit 1
fi

SELECTED_ENTRY="${DOC_ENTRIES[$doc_index]}"
IFS='|' read -r SELECTED_PATH SELECTED_KIND <<< "$SELECTED_ENTRY"
SELECTED_DISPLAY="$(basename "$SELECTED_PATH")"
SELECTED_DOCX="$SELECTED_PATH"
if [[ "$SELECTED_KIND" == "html" ]]; then
    SELECTED_HTML="$SELECTED_PATH"
    if [[ "$SELECTED_HTML" =~ \.[Hh][Tt][Mm][Ll]$ ]]; then
        SELECTED_DOCX="${SELECTED_HTML%.[Hh][Tt][Mm][Ll]}.docx"
    else
        SELECTED_DOCX="${SELECTED_HTML}.docx"
    fi
fi
SELECTED_MD="$(derive_md_path "$SELECTED_DOCX")"

echo ""
echo -e "${GREEN}${BOLD}✓ Selected:${NC} $SELECTED_DISPLAY"
echo ""
show_history_preview 4
if [[ "$SELECTED_KIND" == "html" ]]; then
    HTML_PDF_TARGET="${SELECTED_HTML%.*}.pdf"
    echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${BOLD}  HTML actions${NC}"
    echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}1${NC}) 📘 Build a Word copy (HTML → DOCX)"
    echo -e "  ${CYAN}2${NC}) 🖨️  Export a PDF"
    echo -e "  ${CYAN}3${NC}) 🌐 Open in browser"
    echo -e "  ${CYAN}4${NC}) ↩️  Back to list"
    echo ""
    read -r -p "${CYAN}Choose action (1-4)${NC}: " html_action
    case "$html_action" in
        1)
            echo ""
            echo -e "${BLUE}📘 Converting HTML → Word...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_HTML" to-docx
            echo -e "${GREEN}${BOLD}✓ Created${NC} ${CYAN}$SELECTED_DOCX${NC}"
            ;;
        2)
            echo ""
            echo -e "${BLUE}🖨️  Rendering PDF from HTML...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_HTML" to-pdf "$HTML_PDF_TARGET"
            echo -e "${GREEN}${BOLD}✓ Exported${NC} ${CYAN}$HTML_PDF_TARGET${NC}"
            ;;
        3)
            echo ""
            echo -e "${BLUE}🌐 Opening in default browser...${NC}"
            open "$SELECTED_HTML"
            ;;
        4)
            exec "$0"
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac
    exit 0
fi

echo ""
echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}${BOLD}  What would you like to do?${NC}"
echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}1${NC}) 📄 ${BOLD}Make a Markdown copy${NC} so I can edit here"
LLM_STATUS="$(get_llm_status)"
MCP_STATUS="$(get_mcp_status)"
echo -e "  ${DIM}Status:${NC} ${LLM_STATUS}"
echo -e "          ${MCP_STATUS}"
echo ""
echo -e "     ${DIM}└─ Convert .docx → .md for easy editing${NC}"
echo ""
echo -e "  ${CYAN}2${NC}) 📘 ${BOLD}Create a fresh Word file${NC} from my Markdown"
echo -e "     ${DIM}└─ Convert .md → .docx for sharing/printing${NC}"
echo ""
echo -e "  ${CYAN}3${NC}) 🔄 ${BOLD}Keep both files matched${NC} automatically"
echo -e "     ${DIM}└─ Auto-detect which is newer and sync${NC}"
echo ""
echo -e "  ${CYAN}4${NC}) 👀 ${BOLD}Live update Word${NC} while I edit (watch mode)"
echo -e "     ${DIM}└─ Every save in VS Code refreshes the .docx${NC}"
echo ""
echo -e "  ${CYAN}5${NC}) ✏️  ${BOLD}Open the Markdown${NC} in VS Code"
echo -e "     ${DIM}└─ Launch editor for the .md file${NC}"
echo ""
echo -e "  ${CYAN}6${NC}) 📂 ${BOLD}Open this file${NC} in Microsoft Word"
echo -e "     ${DIM}└─ View/edit the .docx in Word${NC}"
echo ""
echo -e "  ${CYAN}7${NC}) 📜 ${BOLD}Show recent activity${NC}"
echo -e "     ${DIM}└─ View conversion history and logs${NC}"
echo ""
echo -e "  ${CYAN}8${NC}) ↩️  ${BOLD}Undo the last thing${NC} I did"
echo -e "     ${DIM}└─ Restore from backup if available${NC}"
echo ""
echo -e "  ${CYAN}9${NC}) 🧭 ${BOLD}Step-by-step helper${NC} (beginner mode)"
echo -e "     ${DIM}└─ Interactive wizard walks you through${NC}"
echo ""
echo -e " ${CYAN}10${NC}) 🤖 ${BOLD}Pick which AI helper${NC} to use"
echo -e "     ${DIM}└─ Configure local LLM (Ollama/LM Studio)${NC}"
echo ""
echo -e "  ${CYAN}P${NC}) 🖨️  ${BOLD}Export a PDF${NC} (Markdown/HTML → PDF)"
echo -e "     ${DIM}└─ Styled PDF with page numbers${NC}"
echo ""
echo -e "  ${CYAN}H${NC}) 🌐 ${BOLD}Generate HTML preview${NC}"
echo -e "     ${DIM}└─ Standalone web-ready page${NC}"
echo ""
echo -e "  ${CYAN}X${NC}) 📽️  ${BOLD}Export a PowerPoint deck${NC} (PPTX)"
echo -e "     ${DIM}└─ Markdown/HTML → PPTX slide deck${NC}"
echo ""
echo -e "  ${CYAN}K${NC}) 🎞️  ${BOLD}Open in Keynote${NC} (build PPTX first)"
echo -e "     ${DIM}└─ Export PPTX then launch Keynote for editing${NC}"
echo ""
echo -e "  ${CYAN}F${NC}) ❔ ${BOLD}Browse the FAQ${NC}"
echo -e "     ${DIM}└─ Search answers or ask AI follow-ups${NC}"
echo ""
echo -e "  ${CYAN}M${NC}) 🔗 ${BOLD}Install MCP tools${NC} (one-step)"
echo -e "     ${DIM}└─ Copies docsync.yaml to ~/mcp/tools${NC}"
echo ""
echo -e "  ${DIM}Tip:${NC} Tap keys ${CYAN}1-9${NC} for instant shortcuts, ${CYAN}0${NC} for AI helper, ${CYAN}P${NC} for PDF, ${CYAN}H${NC} for HTML, ${CYAN}X${NC} for PPTX, ${CYAN}K${NC} for Keynote, ${CYAN}F${NC} for FAQ, ${CYAN}M${NC} to install MCP."
echo -e "  ${DIM}     ${NC}Press ${CYAN}F${NC} any time to launch the interactive FAQ browser."
echo ""
prompt_action_choice "${CYAN}Choose action (1-10, P, H, X, K, F, or M)${NC}: "
action="$ACTION_SELECTION"

if [[ "$action" == "q" ]]; then
    exit 0
fi

case $action in
    1)
        echo ""
        echo -e "${BLUE}📄 Creating an easy-to-edit Markdown copy...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        echo ""
        echo -e "${GREEN}${BOLD}✓ Success!${NC} Open ${CYAN}$SELECTED_MD${NC} to start editing."
        ;;
    2)
        echo ""
        echo -e "${BLUE}📘 Building a polished Word file from your Markdown...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-docx
        echo ""
        echo -e "${GREEN}${BOLD}✓ Done!${NC} Open ${CYAN}$SELECTED_DOCX${NC} in Word to review."
        ;;
    3)
        echo ""
        echo -e "${BLUE}🔄 Checking which version is newer and syncing...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" auto
        echo ""
        echo -e "${GREEN}${BOLD}✓ Synced!${NC} Both copies now match."
        ;;
    4)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  No Markdown copy yet—creating one for you first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        if ! command -v npm >/dev/null 2>&1; then
            echo ""
            echo -e "${RED}❌ Live updates need Node.js (npm) to be installed.${NC}"
            echo -e "${YELLOW}💡 Tip:${NC} Install it with: ${CYAN}brew install node${NC}"
            exit 1
        fi
        if [[ ! -d node_modules ]]; then
            echo ""
            echo -e "${BLUE}📦 Downloading a few helper packages (one-time step)...${NC}"
            if ! npm install; then
                echo -e "${RED}❌ npm install failed. Please check your internet connection and try again.${NC}"
                echo -e "${YELLOW}💡 Tip:${NC} Run ${CYAN}npm install${NC} manually later, or delete ${CYAN}node_modules${NC} if it's only partially created before retrying."
                exit 1
            fi
        fi
        echo ""
        echo -e "${GREEN}${BOLD}👀 Live updates are running!${NC}"
        echo -e "${CYAN}Every time you save ${BOLD}$SELECTED_MD${NC}${CYAN}, the Word file updates automatically.${NC}"
        echo ""
        echo -e "${YELLOW}💡 Leave this window open. Press ${BOLD}Ctrl+C${NC}${YELLOW} to stop when you're finished.${NC}"
        echo ""
        MD_FILE="$SELECTED_MD" DOCX_FILE="$SELECTED_DOCX" npm run watch
        ;;
    5)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Markdown file doesn't exist. Converting first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        echo ""
        echo -e "${BLUE}✏️  Opening in VS Code...${NC}"
        open -a "Visual Studio Code" "$SELECTED_MD"
        ;;
    6)
        echo ""
        echo -e "${BLUE}📂 Opening Word document...${NC}"
        open "$SELECTED_DOCX"
        ;;
    mcp-install)
        echo ""
        echo -e "${BLUE}🔗 Installing MCP tools...${NC}"
        ./scripts/install-mcp.sh
        echo ""
        echo -e "${GREEN}${BOLD}✓ MCP tools installed.${NC} Restart your MCP client (Claude Desktop, Context7, VS Code) so it sees docSync."
        ;;
    pdf)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Markdown file missing. Creating one first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        PDF_TARGET="${SELECTED_MD%.*}.pdf"
        echo ""
        echo -e "${BLUE}🖨️  Exporting a styled PDF...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-pdf "$PDF_TARGET"
        echo -e "${GREEN}${BOLD}✓ PDF ready:${NC} ${CYAN}$PDF_TARGET${NC}"
        ;;
    html)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Markdown file missing. Creating one first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        HTML_TARGET="${SELECTED_MD%.*}.html"
        echo ""
        echo -e "${BLUE}🌐 Generating a standalone HTML preview...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-html "$HTML_TARGET"
        echo -e "${GREEN}${BOLD}✓ Preview saved:${NC} ${CYAN}$HTML_TARGET${NC}"
        ;;
    pptx)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Markdown file missing. Creating one first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        PPTX_TARGET="${SELECTED_MD%.*}.pptx"
        echo ""
        echo -e "${BLUE}📽️  Exporting a PowerPoint deck...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-pptx "$PPTX_TARGET"
        echo -e "${GREEN}${BOLD}✓ PPTX ready:${NC} ${CYAN}$PPTX_TARGET${NC}"
        ;;
    keynote)
        if [[ ! -f "$SELECTED_MD" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Markdown file missing. Creating one first...${NC}"
            ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-md
        fi
        PPTX_TARGET="${SELECTED_MD%.*}.pptx"
        echo ""
        echo -e "${BLUE}🎞️  Exporting PPTX and launching Keynote...${NC}"
        ./scripts/docx-sync.sh "$SELECTED_DOCX" "$SELECTED_MD" to-pptx "$PPTX_TARGET"
        if ! open -Ra "Keynote" >/dev/null 2>&1; then
            echo -e "${RED}❌ Keynote is not installed.${NC}"
            echo -e "${YELLOW}💡 Tip:${NC} Install Keynote from the Mac App Store, then rerun this option to open ${CYAN}$PPTX_TARGET${NC}."
            exit 1
        fi
        if ! open -a "Keynote" "$PPTX_TARGET"; then
            echo -e "${RED}❌ Failed to launch Keynote via CLI.${NC}"
            echo -e "${YELLOW}💡 Tip:${NC} Double-click ${CYAN}$PPTX_TARGET${NC} in Finder after installing Keynote, or retry once Keynote finishes updating."
            exit 1
        fi
        echo -e "${GREEN}${BOLD}✓ Opened in Keynote:${NC} ${CYAN}$PPTX_TARGET${NC}"
        ;;
    7)
        if [[ ! -f "$HISTORY_FILE" ]]; then
            echo ""
            echo -e "${YELLOW}📜 No history found yet.${NC}"
        else
            echo ""
            echo -e "${GREEN}${BOLD}📜 Recent conversions:${NC}"
            echo ""
            tail -n 10 "$HISTORY_FILE" | while IFS='|' read -r ts mode source target status duration warnings backup note; do
                [[ -z "$ts" ]] && continue
                display_target="$(basename "$target")"
                display_source="$(basename "$source")"
                summary="  ${DIM}${ts}${NC} • ${CYAN}${mode}${NC}"
                if [[ "$status" == "success" ]]; then
                    summary+=" • ${GREEN}✓${NC}"
                else
                    summary+=" • ${RED}✗${NC}"
                fi
                if [[ -n "$duration" ]]; then
                    summary+=" • ${duration}s"
                fi
                if [[ "$warnings" != "none" && -n "$warnings" ]]; then
                    summary+=" • ${YELLOW}⚠${NC} ${warnings}"
                fi
                if [[ -n "$note" && "$note" != "completed" ]]; then
                    summary+=" • ${note}"
                fi
                summary+=" • ${display_source} → ${display_target}"
                echo -e "$summary"
            done
        fi
        ;;
    8)
        if [[ ! -f "$HISTORY_FILE" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  No history to undo.${NC}"
            exit 0
        fi
        last_entry="$(tail -n 1 "$HISTORY_FILE")"
        if [[ -z "$last_entry" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  History file is empty.${NC}"
            exit 0
        fi
        IFS='|' read -r ts mode source target status duration warnings backup note <<< "$last_entry"
        if [[ "$status" != "success" ]]; then
            echo ""
            echo -e "${YELLOW}⚠️  Last conversion was not successful; nothing to undo.${NC}"
            exit 0
        fi
        if [[ -n "$backup" && -f "$backup" ]]; then
            if cp "$backup" "$target"; then
                echo ""
                echo -e "${GREEN}${BOLD}✓ Restored${NC} previous version from backup: ${CYAN}$target${NC}"
                undo_note="undo restored backup"
            else
                echo ""
                echo -e "${RED}❌ Failed to restore backup.${NC}"
                exit 1
            fi
        else
            if [[ -f "$target" ]]; then
                rm "$target"
                echo ""
                echo -e "${GREEN}${BOLD}✓ Removed${NC} newly created file: ${CYAN}$target${NC}"
                undo_note="undo removed new file"
            else
                echo ""
                echo -e "${YELLOW}⚠️  No backup available and target missing; nothing to undo.${NC}"
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
        echo ""
        echo -e "${BLUE}🧭 Starting the beginner-friendly wizard...${NC}"
        ./scripts/guided-sync.sh
        ;;
    10)
        echo ""
        echo -e "${BLUE}🤖 Scanning for local LLM runtimes...${NC}"
        ./scripts/configure-llm.sh
        ;;
    faq)
        echo ""
        ./scripts/faq.sh
        ;;
    *)
        echo ""
        echo -e "${RED}❌ Invalid action${NC}"
        echo -e "${YELLOW}💡 Tip:${NC} Tap keys ${CYAN}1-9${NC}, press ${CYAN}0${NC} for the AI helper, ${CYAN}P${NC}/${CYAN}H${NC}/${CYAN}X${NC}/${CYAN}K${NC} for exports, hit ${CYAN}F${NC} for the FAQ, or type the full option number then hit Enter."
        exit 1
        ;;
esac

echo ""
