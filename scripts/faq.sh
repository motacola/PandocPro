#!/usr/bin/env bash
# Interactive FAQ browser with optional AI follow-up

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FAQ_FILE="$PROJECT_ROOT/FAQ.md"
LLM_CONFIG="$PROJECT_ROOT/config/llm-selection.json"

if [[ ! -f "$FAQ_FILE" ]]; then
    echo "FAQ file not found at $FAQ_FILE" >&2
    exit 1
fi

QUESTIONS=()
ANSWERS=()
SECTIONS=()
current_question=""
current_answer=""
current_section=""

flush_question() {
    if [[ -n "$current_question" ]]; then
        QUESTIONS+=("$current_question")
        ANSWERS+=("${current_answer%$'\n'}")
        SECTIONS+=("$current_section")
        current_answer=""
        current_question=""
    fi
}

while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^##[[:space:]]+ ]]; then
        flush_question
        current_section="${line#\#\# }"
        continue
    fi
    if [[ "$line" =~ ^\*\*Q: ]]; then
        flush_question
        current_question="${line//\*\*/}"
        continue
    fi
    if [[ -n "$current_question" ]]; then
        current_answer+="$line"$'\n'
    fi
done < "$FAQ_FILE"
flush_question

if [[ ${#QUESTIONS[@]} -eq 0 ]]; then
    echo "No questions were parsed from FAQ.md" >&2
    exit 1
fi

has_llm_config=false
if [[ -f "$LLM_CONFIG" ]]; then
    has_llm_config=true
fi

print_menu() {
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║         PandocPro FAQ Browser        ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    printf "Found %d questions. Enter a number or 'q' to exit.\n" "${#QUESTIONS[@]}"
    if $has_llm_config; then
        echo "AI follow-up is available after each answer."
    else
        echo "Tip: Configure an AI helper with ./scripts/configure-llm.sh to get follow-up answers."
    fi
    echo ""
    local i=0
    while (( i < ${#QUESTIONS[@]} )); do
        printf "%2d) %s\n" $((i + 1)) "${QUESTIONS[$i]//**Q: /}"
        ((i++))
    done
    echo ""
}

ask_ai_follow_up() {
    local question="$1"
    local answer="$2"
    local prompt_text="$3"
    local q_b64 a_b64 f_b64
    q_b64="$(printf '%s' "$question" | base64 | tr -d '\n')"
    a_b64="$(printf '%s' "$answer" | base64 | tr -d '\n')"
    f_b64="$(printf '%s' "$prompt_text" | base64 | tr -d '\n')"
    if ! output="$(node "$SCRIPT_DIR/faq-ai.js" "$PROJECT_ROOT" "$q_b64" "$a_b64" "$f_b64" 2>&1)"; then
        echo -e "\n${RED:-}⚠️  AI request failed:${NC:-} $output"
    else
        echo -e "\n${CYAN:-}🤖 AI says:${NC:-}\n$output\n"
    fi
}

while true; do
    print_menu
    read -p "Select a question (or 'q'): " choice
    if [[ "$choice" == "q" ]]; then
        exit 0
    fi
    if [[ ! "$choice" =~ ^[0-9]+$ ]]; then
        echo "Please enter a valid number."
        continue
    fi
    index=$((choice - 1))
    if (( index < 0 || index >= ${#QUESTIONS[@]} )); then
        echo "That number is out of range."
        continue
    fi
    question="${QUESTIONS[$index]}"
    answer="${ANSWERS[$index]}"
    section="${SECTIONS[$index]}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [[ -n "$section" ]]; then
        echo "$section"
        echo "----------------------------------------"
    fi
    echo "$question"
    echo ""
    printf '%s\n' "$answer"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if $has_llm_config; then
        read -p "Ask an AI follow-up? (y/N): " ask
        if [[ "$ask" =~ ^[yY]$ ]]; then
            read -p "Enter your follow-up (leave blank to reuse the FAQ question): " follow
            if [[ -z "$follow" ]]; then
                follow="$question"
            fi
            ask_ai_follow_up "$question" "$answer" "$follow"
        fi
    fi
    read -p "Press Enter to see the list again (or 'q' to quit): " cont
    [[ "$cont" == "q" ]] && exit 0
done
