#!/bin/bash
# QA Checks Script for PandocPro
# This script runs comprehensive quality assurance checks

set -e

echo "🔍 Running PandocPro QA Checks..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to report results
report() {
    local status=$1
    local message=$2
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $message"
        ((FAILED++))
    fi
}

echo ""
echo "📦 1. Package Integrity Checks"
echo "--------------------------------"

# Check package.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "gui/package.json" ]; then
    report 0 "gui/package.json exists"
    if grep -q '"name":' "gui/package.json"; then
        report 0 "gui/package.json has valid name field"
    else
        report 1 "gui/package.json missing name field"
    fi
    if grep -q '"version":' "gui/package.json"; then
        report 0 "gui/package.json has valid version field"
    else
        report 1 "gui/package.json missing version field"
    fi
else
    report 1 "gui/package.json not found"
fi

# Check for critical files
echo ""
echo "📂 2. File Structure Checks"
echo "--------------------------------"

REQUIRED_FILES=(
    "gui/src/App.tsx"
    "gui/src/main.tsx"
    "gui/electron/main/index.ts"
    "gui/electron/preload/index.ts"
    "README.md"
    "INSTALL.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        report 0 "$file exists"
    else
        report 1 "$file missing"
    fi
done

echo ""
echo "🔧 3. Build System Checks"
echo "--------------------------------"

# Check for build scripts
if grep -q '"build":' "gui/package.json"; then
    report 0 "Build script defined in package.json"
else
    report 1 "Build script missing in package.json"
fi

# Check for test scripts
if grep -q '"test":' "gui/package.json"; then
    report 0 "Test script defined in package.json"
else
    report 1 "Test script missing in package.json"
fi

# Check for lint scripts
if grep -q '"lint":' "gui/package.json"; then
    report 0 "Lint script defined in package.json"
else
    report 1 "Lint script missing in package.json"
fi

echo ""
echo "📝 4. Code Quality Checks"
echo "--------------------------------"

# Check TypeScript compilation
cd gui
if npm run build 2>&1 | grep -q "error TS"; then
    report 1 "TypeScript compilation errors found"
else
    report 0 "TypeScript compilation successful"
fi

# Check for common issues
if grep -r "console.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test/" | grep -v "\.next/" | head -5; then
    echo -e "${YELLOW}⚠️  Warning: console.log found in source files${NC}"
    ((WARNINGS++))
fi

echo ""
echo "🔒 5. Security Checks"
echo "--------------------------------"

# Check for context isolation
if grep -q "contextIsolation: true" "gui/electron/main/index.ts"; then
    report 0 "Context isolation enabled"
else
    report 1 "Context isolation not enabled"
fi

# Check for node integration
if grep -q "nodeIntegration: false" "gui/electron/main/index.ts"; then
    report 0 "Node integration disabled (secure)"
else
    report 1 "Node integration may be enabled (security risk)"
fi

# Check for sandbox
if grep -q "sandbox:" "gui/electron/main/index.ts"; then
    report 0 "Sandbox configuration found"
else
    report 1 "Sandbox not configured"
fi

echo ""
echo "📊 6. Bundle Size Analysis"
echo "--------------------------------"

if [ -d "dist" ]; then
    TOTAL_SIZE=$(du -sh dist/ | cut -f1)
    echo "Total dist size: $TOTAL_SIZE"
    
    if [ "${TOTAL_SIZE:0:1}" = "1" ] || [ "${TOTAL_SIZE:0:1}" = "2" ]; then
        report 0 "Bundle size is reasonable (<3MB)"
    else
        report 1 "Bundle size may be too large (>3MB)"
        ((WARNINGS++))
    fi
else
    report 1 "dist directory not found (run build first)"
fi

echo ""
echo "🧪 7. Test Suite Checks"
echo "--------------------------------"

# Check if test files exist
if [ -f "gui/test/e2e.spec.ts" ]; then
    report 0 "E2E test file exists"
else
    report 1 "E2E test file missing"
fi

if [ -f "gui/test/ai-analysis.test.ts" ]; then
    report 0 "AI analysis test file exists"
else
    report 1 "AI analysis test file missing"
fi

# Run tests
cd gui
if npm test 2>&1 | grep -q "failed"; then
    report 1 "Some tests failed"
else
    report 0 "All tests passed"
fi

echo ""
echo "📋 8. Documentation Checks"
echo "--------------------------------"

# Check for README
if [ -f "README.md" ]; then
    report 0 "Main README.md exists"
else
    report 1 "Main README.md missing"
fi

# Check for INSTALL guide
if [ -f "INSTALL.md" ]; then
    report 0 "INSTALL.md exists"
else
    report 1 "INSTALL.md missing"
fi

# Check for AI integration guide
if [ -f "AI-INTEGRATION-GUIDE.md" ]; then
    report 0 "AI-INTEGRATION-GUIDE.md exists"
else
    report 1 "AI-INTEGRATION-GUIDE.md missing"
fi

echo ""
echo "⚙️  9. Workflow Checks"
echo "--------------------------------"

# Check for CI workflows
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(ls .github/workflows/*.yml 2>/dev/null | wc -l)
    echo "Found $WORKFLOW_COUNT workflow files"
    
    if [ $WORKFLOW_COUNT -gt 0 ]; then
        report 0 "CI/CD workflows configured"
    else
        report 1 "No CI/CD workflows found"
    fi
else
    report 1 ".github/workflows directory missing"
fi

# Check for specific workflows
if [ -f ".github/workflows/ci.yml" ]; then
    report 0 "CI workflow (ci.yml) exists"
else
    report 1 "CI workflow (ci.yml) missing"
fi

if [ -f ".github/workflows/electron-build.yml" ]; then
    report 0 "Electron build workflow exists"
else
    report 1 "Electron build workflow missing"
fi

echo ""
echo "=================================="
echo "📊 QA Check Summary"
echo "=================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
echo "Total Checks: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review errors above.${NC}"
    exit 1
fi
