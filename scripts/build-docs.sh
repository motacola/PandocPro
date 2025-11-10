#!/usr/bin/env bash
# Build static HTML documentation from Markdown sources.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

SITE_DIR="$PROJECT_ROOT/site"
ASSETS_DIR="$SITE_DIR/assets"
STYLE_FILE="$ASSETS_DIR/style.css"
HEADER_FILE="$ASSETS_DIR/head.html"

DOCS=(
  "START-HERE.md"
  "QUICKSTART.md"
  "README.md"
  "INDEX.md"
  "REFERENCE-CARD.md"
  "VSCODE-GUIDE.md"
  "VISUAL-GUIDE.md"
  "MCP-AUTOMATION.md"
  "MCP-INTEGRATION.md"
  "SETUP-COMPLETE.md"
  "IMPROVEMENTS.md"
  "COMPLETE-SUMMARY.md"
)

TITLES=(
  "Start Here"
  "Quick Start"
  "Main README"
  "Documentation Index"
  "Reference Card"
  "VS Code Guide"
  "Visual Guide"
  "MCP Automation"
  "MCP Integration"
  "Setup Complete"
  "Improvements"
  "Complete Summary"
)

if ! command -v pandoc >/dev/null 2>&1; then
  echo "❌ pandoc not found. Install with 'brew install pandoc' and rerun." >&2
  exit 1
fi

mkdir -p "$ASSETS_DIR"

cat > "$STYLE_FILE" <<'CSS'
:root {
  color-scheme: light dark;
  --bg: #0a0a0a;
  --fg: #f8f8f2;
  --accent: #7dd3fc;
  --accent-dark: #0284c7;
  --muted: #94a3b8;
  --card: rgba(255, 255, 255, 0.04);
  --border: rgba(255, 255, 255, 0.15);
  font-size: 16px;
}

body {
  font-family: "SF Pro Display", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
  padding: 0;
  background: #0f172a;
  color: var(--fg);
  line-height: 1.6;
}

.layout {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  margin-bottom: 0.25rem;
  font-size: 2.25rem;
  background: linear-gradient(120deg, #bae6fd, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

header p {
  color: var(--muted);
  margin: 0;
}

a {
  color: var(--accent);
}

main {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 2rem;
  box-shadow: 0 25px 70px rgba(15, 23, 42, 0.6);
}

pre {
  border-radius: 12px;
  padding: 1rem;
  background: #111827;
  overflow-x: auto;
}

code {
  font-family: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.doc-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  padding: 0;
  list-style: none;
  margin: 2rem 0 0;
}

.doc-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  background: var(--card);
  transition: border 120ms ease, transform 120ms ease;
}

.doc-card:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
}

.doc-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
}

.doc-card p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--muted);
}

@media (max-width: 640px) {
  main {
    padding: 1.25rem;
  }
}
CSS

generate_doc() {
  local source="$1"
  local title="$2"
  local basename
  basename="$(basename "$source" .md)"
  local output="$SITE_DIR/${basename}.html"

  echo "➡️  Building ${output#$PROJECT_ROOT/}"
  pandoc "$source" \
    --standalone \
    --metadata title="$title" \
    --include-in-header "$HEADER_FILE" \
    -o "$output"
}

cat > "$HEADER_FILE" <<'HTML'
<link rel="stylesheet" href="assets/style.css">
HTML

cat > "$SITE_DIR/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PandocPro Documentation</title>
  <link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <div class="layout">
    <header>
      <h1>PandocPro Documentation Hub</h1>
      <p>Breeze through setup, watch mode, AI workflows, and reference cards—all in one place.</p>
    </header>
    <main>
      <ul class="doc-card-grid">
HTML

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  title="${TITLES[$i]}"
  base="${doc%.md}.html"
  cat >> "$SITE_DIR/index.html" <<HTML
        <li class="doc-card">
          <h3><a href="${base}">${title}</a></h3>
          <p>${doc}</p>
        </li>
HTML
done

cat >> "$SITE_DIR/index.html" <<'HTML'
      </ul>
    </main>
  </div>
</body>
</html>
HTML

for i in "${!DOCS[@]}"; do
  generate_doc "${DOCS[$i]}" "${TITLES[$i]}"
done

echo ""
echo "✅ HTML docs ready inside: $SITE_DIR"
