#!/usr/bin/env bash
# Beginner-friendly wizard for Word ↔ Markdown sync

set -euo pipefail

if [[ -z "${TERM:-}" ]]; then
    export TERM=dumb
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DOCS_DIR="$PROJECT_ROOT/docs"
SELECTED_FILE=""
PARTNER_FILE=""
FILE_CHOICES=()

bold() { printf "\033[1m%s\033[0m\n" "$1"; }

check_requirements() {
    if ! command -v pandoc >/dev/null 2>&1; then
        echo ""
        bold "Pandoc is missing."
        echo "This tool uses Pandoc to convert between Word and Markdown."
        echo "Install it with:"
        echo "  brew install pandoc"
        echo ""
        echo "After installing Pandoc, run this wizard again."
        exit 1
    fi
}

gather_files() {
    local pattern="$1"
    FILE_CHOICES=()
    while IFS= read -r file; do
        FILE_CHOICES+=("$file")
    done < <(find "$DOCS_DIR" -type f -iname "$pattern" -print 2>/dev/null | sort)
}

pick_file() {
    local direction="$1"
    local pattern="$2"
    local prompt="$3"

    while true; do
        echo ""
        bold "$prompt"
        echo "Looking in: $DOCS_DIR"
        gather_files "$pattern"
        if [[ ${#FILE_CHOICES[@]} -eq 0 ]]; then
            echo ""
            echo "No matching files were found. Place your files inside the docs/ folder."
            return 1
        fi
        local idx=1
        for file in "${FILE_CHOICES[@]}"; do
            local display="${file#"$DOCS_DIR"/}"
            echo "  $idx) $display"
            idx=$((idx + 1))
        done

        echo ""
        read -p "Type the number of the file to use: " choice
        if [[ ! "$choice" =~ ^[0-9]+$ ]]; then
            echo "Please enter a number from the list."
            continue
        fi

        local index=$choice
        if (( index < 1 || index > ${#FILE_CHOICES[@]} )); then
            echo "That number is out of range."
            continue
        fi

        SELECTED_FILE="${FILE_CHOICES[$((index - 1))]}"
        echo ""
        echo "You chose: ${SELECTED_FILE#"$DOCS_DIR"/}"

        read -p "Is this correct? (y/n): " confirm
        if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
            return 0
        fi
    done
}

derive_partner_path() {
    local input_file="$1"
    local direction="$2"
    local base="${input_file%.*}"
    if [[ "$direction" == "to-md" ]]; then
        PARTNER_FILE="$base.md"
    else
        PARTNER_FILE="$base.docx"
    fi
}

convert_file() {
    local direction="$1"
    local docx_path
    local md_path

    if [[ "$direction" == "to-md" ]]; then
        docx_path="$SELECTED_FILE"
        derive_partner_path "$SELECTED_FILE" "$direction"
        md_path="$PARTNER_FILE"
        echo ""
        bold "Converting Word to Markdown"
        ./scripts/docx-sync.sh "$docx_path" "$md_path" to-md
        echo ""
        echo "Next steps:"
        echo "1. Open $md_path in VS Code to edit the content."
        echo "2. When you finish editing, rerun this wizard and choose the Markdown → Word option."
    else
        md_path="$SELECTED_FILE"
        derive_partner_path "$SELECTED_FILE" "$direction"
        docx_path="$PARTNER_FILE"
        echo ""
        bold "Converting Markdown to Word"
        ./scripts/docx-sync.sh "$docx_path" "$md_path" to-docx
        echo ""
        echo "Next steps:"
        echo "1. Open $docx_path in Microsoft Word to review formatting."
        echo "2. Share or deliver the Word document as needed."
    fi
}

main_menu() {
    while true; do
        printf "\n\n"
        bold "Welcome! Let's sync Word and Markdown without any coding."
        echo ""
        echo "What would you like to do?"
        echo "  1) I have a Word (.docx) file and want a Markdown copy"
        echo "  2) I edited a Markdown (.md) file and need to update the Word document"
        echo "  3) Show me tips and exit"
        echo ""
        read -p "Choose an option (1-3): " choice

        case "$choice" in
            1)
                if pick_file "to-md" "*.docx" "Pick the Word document you want to convert to Markdown."; then
                    convert_file "to-md"
                fi
                read -p "Press Enter to return to the menu..." _
                ;;
            2)
                if pick_file "to-docx" "*.md" "Pick the Markdown file you edited and want to export back to Word."; then
                    convert_file "to-docx"
                fi
                read -p "Press Enter to return to the menu..." _
                ;;
            3)
                echo ""
                echo "Tips:"
                echo "- Keep your Word and Markdown versions in the same folder."
                echo "- Run this wizard anytime you are unsure which command to use."
                echo "- Watch mode is available in the main menu if you want automatic updates."
                echo ""
                echo "You're all set. Goodbye!"
                exit 0
                ;;
            *)
                echo "Please choose 1, 2, or 3."
                sleep 1
                ;;
        esac
    done
}

check_requirements
main_menu
