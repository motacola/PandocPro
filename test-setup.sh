#!/usr/bin/env bash
# Quick test to verify setup

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🧪 Testing Word ↔ Markdown Sync Setup...${NC}"
echo ""

# Test 1: Check pandoc
echo -n "1. Checking pandoc... "
if command -v pandoc >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ pandoc not found${NC}"
    exit 1
fi

# Test 2: Check alias
echo -n "2. Checking dsync alias... "
if grep -q "alias dsync=" ~/.zshrc 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ run ./scripts/setup-alias.sh${NC}"
fi

# Test 3: Check scripts
echo -n "3. Checking scripts... "
if [[ -x "scripts/menu.sh" ]] && [[ -x "scripts/docx-sync.sh" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ scripts not executable${NC}"
    exit 1
fi

# Test 4: Check test files
echo -n "4. Checking test documents... "
if [[ -f "docs/test.docx" ]] && [[ -f "docs/test.md" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ test files missing${NC}"
    exit 1
fi

# Test 5: Test conversion
echo -n "5. Testing conversion... "
if ./scripts/docx-sync.sh docs/test.docx docs/test.md auto >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ conversion failed${NC}"
    exit 1
fi

# Test 6: Check Node modules (optional)
echo -n "6. Checking watch mode deps... "
if [[ -d "node_modules" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ run: npm install${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Try it out:"
echo "  1. Run: ${BLUE}dsync${NC} (or ${BLUE}source ~/.zshrc${NC} first)"
echo "  2. Or: ${BLUE}./sync${NC}"
echo ""
