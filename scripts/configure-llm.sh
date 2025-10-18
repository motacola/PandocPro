#!/usr/bin/env bash
# Detect local LLM runtimes and store preferred configuration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/config"
CONFIG_FILE="$CONFIG_DIR/llm-selection.json"

mkdir -p "$CONFIG_DIR"

declare -a OPTION_KEYS=()
declare -a OPTION_LABELS=()

add_option() {
  local key="$1"
  local label="$2"
  OPTION_KEYS+=("$key")
  OPTION_LABELS+=("$label")
}

detect_ollama() {
  if command -v ollama >/dev/null 2>&1; then
    add_option "ollama" "Ollama (local host port 11434)"
  fi
}

detect_lmstudio() {
  if [[ -d "/Applications/LM Studio.app" ]] || [[ -d "$HOME/Applications/LM Studio.app" ]]; then
    add_option "lmstudio" "LM Studio (local server port 1234)"
  fi
}

detect_llamacpp() {
  if command -v llama.cpp >/dev/null 2>&1; then
    add_option "llamacpp" "llama.cpp server (custom endpoint)"
  elif command -v server >/dev/null 2>&1 && [[ "$(server --help 2>/dev/null | head -n 1)" == *"llama.cpp"* ]]; then
    add_option "llamacpp" "llama.cpp server (custom endpoint)"
  fi
}

detect_ollama
detect_lmstudio
detect_llamacpp

add_option "custom" "Custom HTTP endpoint"

print_header() {
  echo "╔══════════════════════════════════════════════╗"
  echo "║      Configure Local AI Assistant (LLM)      ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
}

print_detected() {
  local detected_count=$(( ${#OPTION_KEYS[@]} - 1 ))
  if [[ "$detected_count" -gt 0 ]]; then
    echo "Detected the following local LLM runtimes:"
  else
    echo "No known local LLM runtimes were detected automatically."
  fi
  echo ""
}

prompt_selection() {
  local total="${#OPTION_KEYS[@]}"
  local index=0

  while (( index < total )); do
    echo "  $((index + 1))) ${OPTION_LABELS[$index]}"
    ((index+=1))
  done

  echo ""
  read -p "Choose an option: " selection

  if [[ ! "$selection" =~ ^[0-9]+$ ]]; then
    echo "Invalid selection."
    exit 1
  fi

  if (( selection < 1 || selection > total )); then
    echo "Invalid selection."
    exit 1
  fi

  local chosen_index=$((selection - 1))
  SELECTED_KEY="${OPTION_KEYS[$chosen_index]}"
}

write_config() {
  local provider="$1"
  local display_name="$2"
  local endpoint="$3"
  local model="$4"
  local notes="$5"

  cat > "$CONFIG_FILE" <<EOF
{
  "provider": "$provider",
  "displayName": "$display_name",
  "endpoint": "$endpoint",
  "model": "$model",
  "notes": "$notes"
}
EOF
}

configure_ollama() {
  local default_endpoint="http://localhost:11434"
  local notes="Use 'ollama serve' to run the REST API. Update model name with 'ollama list'."
  local models=""

  if models="$(ollama list 2>/dev/null | awk 'NR>1 {print $1}')" && [[ -n "$models" ]]; then
    echo ""
    echo "Available Ollama models on this machine:"
    echo "$models" | sed 's/^/  • /'
    echo ""
  fi

  read -p "Model to use (e.g., llama3, mistral, gemma2): " model
  model="${model:-llama3}"

  read -p "Endpoint URL [$default_endpoint]: " endpoint
  endpoint="${endpoint:-$default_endpoint}"

  write_config "ollama" "Ollama (local)" "$endpoint" "$model" "$notes"
}

configure_lmstudio() {
  local default_endpoint="http://localhost:1234/v1"
  local notes="Start LM Studio's local server (Settings → Developer → Enable Local Inference Server)."

  read -p "Model ID to use (visible in LM Studio UI): " model
  model="${model:-local-model}"

  read -p "Endpoint URL [$default_endpoint]: " endpoint
  endpoint="${endpoint:-$default_endpoint}"

  write_config "lmstudio" "LM Studio" "$endpoint" "$model" "$notes"
}

configure_llamacpp() {
  local default_endpoint="http://localhost:8080"
  local notes="Start llama.cpp with '--server --port 8080 --model <path>' to expose an API."

  read -p "Friendly name for this model (e.g., llama.cpp-7b): " name
  name="${name:-llama.cpp}"

  read -p "Endpoint URL [$default_endpoint]: " endpoint
  endpoint="${endpoint:-$default_endpoint}"

  read -p "Model parameter (if required, else leave blank): " model
  model="${model:-}"

  write_config "llamacpp" "$name" "$endpoint" "$model" "$notes"
}

configure_custom() {
  echo ""
  echo "Enter the details for your local or remote LLM endpoint."
  read -p "Display name: " name
  name="${name:-Custom LLM}"

  read -p "Endpoint URL (e.g., http://localhost:8000/v1): " endpoint
  if [[ -z "$endpoint" ]]; then
    echo "Endpoint URL is required."
    exit 1
  fi

  read -p "Model identifier (if applicable, else leave blank): " model
  model="${model:-}"

  read -p "Notes (optional): " notes
  notes="${notes:-Custom endpoint configured manually.}"

  write_config "custom" "$name" "$endpoint" "$model" "$notes"
}

print_summary() {
  echo ""
  echo "✅ Saved LLM preference to: $CONFIG_FILE"
  echo ""
  echo "You can reference this file when configuring MCP or other automation:"
  echo "  provider : $(jq -r '.provider' "$CONFIG_FILE" 2>/dev/null || echo 'n/a')"
  echo "  endpoint : $(jq -r '.endpoint' "$CONFIG_FILE" 2>/dev/null || echo 'n/a')"
  echo "  model    : $(jq -r '.model' "$CONFIG_FILE" 2>/dev/null || echo 'n/a')"
}

main() {
  print_header
  print_detected
  prompt_selection

  case "$SELECTED_KEY" in
    ollama)
      configure_ollama
      ;;
    lmstudio)
      configure_lmstudio
      ;;
    llamacpp)
      configure_llamacpp
      ;;
    custom)
      configure_custom
      ;;
    *)
      echo "Unsupported selection: $SELECTED_KEY"
      exit 1
      ;;
  esac

  if command -v jq >/dev/null 2>&1; then
    print_summary
  else
    echo ""
    echo "Install 'jq' to pretty-print the saved configuration if desired."
    echo "Configuration saved to: $CONFIG_FILE"
  fi
}

main "$@"
