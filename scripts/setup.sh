#!/usr/bin/env bash
# Guided setup helper for PandocPro quick-start.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

AUTO_CONFIRM=false
CHECK_ONLY=false

usage() {
  cat <<'EOF'
Word ↔ Markdown Setup Helper

Usage:
  ./scripts/setup.sh [--yes] [--check-only]

Options:
  --yes, -y       Automatically answer "yes" to prompts (best for automation)
  --check-only    Only report status; do not install or change anything
  --help          Show this help text

This script checks common dependencies (Homebrew, Pandoc, Node.js), runs npm install,
and optionally adds the `dsync` alias for you.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)
      AUTO_CONFIRM=true
      shift
      ;;
    --check-only)
      CHECK_ONLY=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

banner() {
  echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
  printf "%b║ %-49s ║%b\n" "$BLUE" "$1" "$NC"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
}

confirm() {
  local prompt="$1"
  if [[ "$AUTO_CONFIRM" == "true" ]]; then
    return 0
  fi
  read -rp "$prompt (y/n): " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

run_or_echo() {
  local cmd="$1"
  if [[ "$CHECK_ONLY" == "true" ]]; then
    echo -e "${YELLOW}Would run:${NC} $cmd"
  else
    eval "$cmd"
  fi
}

banner "PandocPro Quick Setup"
echo "Project root: $PROJECT_ROOT"
echo ""

echo -e "${GREEN}Step 1/5: Checking Homebrew...${NC}"
if command -v brew >/dev/null 2>&1; then
  echo "✅ Homebrew detected"
else
  echo -e "${YELLOW}⚠️  Homebrew not found.${NC}"
  echo "   Install from https://brew.sh/ and rerun this script."
fi
echo ""

echo -e "${GREEN}Step 2/5: Checking Pandoc...${NC}"
if command -v pandoc >/dev/null 2>&1; then
  echo "✅ Pandoc detected ($(pandoc -v | head -n1))"
else
  echo -e "${RED}Pandoc is missing.${NC}"
  if command -v brew >/dev/null 2>&1; then
    if confirm "Install Pandoc with Homebrew now?"; then
      run_or_echo "brew install pandoc"
    else
      echo "Skipping Pandoc installation."
    fi
  else
    echo "Install Pandoc manually (e.g., 'brew install pandoc') and rerun."
  fi
fi
echo ""

echo -e "${GREEN}Step 3/5: Checking Node.js & npm...${NC}"
if command -v node >/dev/null 2>&1; then
  echo "✅ Node.js $(node --version)"
else
  echo -e "${RED}Node.js not found.${NC}"
  echo "Install from https://nodejs.org or via brew (brew install node)."
fi

if command -v npm >/dev/null 2>&1; then
  echo "✅ npm $(npm --version)"
else
  echo -e "${RED}npm not found.${NC}"
fi

if [[ -d "$PROJECT_ROOT/node_modules" ]] && [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
  echo "📦 Dependencies already installed."
else
  if command -v npm >/dev/null 2>&1; then
    echo "📦 Installing npm dependencies..."
    run_or_echo "npm install"
  else
    echo -e "${YELLOW}Skipping npm install (npm missing).${NC}"
  fi
fi
echo ""

echo -e "${GREEN}Step 4/5: Optional dsync alias...${NC}"
if confirm "Add/refresh the dsync alias for quick access?"; then
  if [[ "$CHECK_ONLY" == "true" ]]; then
    echo -e "${YELLOW}Would run:${NC} ./scripts/setup-alias.sh"
  else
    ./scripts/setup-alias.sh
  fi
else
  echo "Skipping alias setup."
fi
echo ""

echo -e "${GREEN}Step 5/5: Desktop launcher (double-click).${NC}"
if confirm "Create/refresh the Desktop launcher now?"; then
  if [[ "$CHECK_ONLY" == "true" ]]; then
    echo -e "${YELLOW}Would run:${NC} ./scripts/create-launcher.sh"
  else
    ./scripts/create-launcher.sh
  fi
else
  echo "Skipping launcher creation."
fi
echo ""

echo -e "${GREEN}All done!${NC} You can now run ${GREEN}dsync${NC}, double-click the Desktop launcher, or use ${GREEN}./scripts/menu.sh${NC}."
