# 🚀 Quick Start Guide

This walkthrough takes about five minutes and you don’t need to be “technical” to follow it.

---

## 1. Set Things Up (one time only)

Copy and paste the commands below into Terminal. They download PandocPro, install the helper scripts, and make the `dsync` shortcut available everywhere.

```bash
git clone https://github.com/motacola/PandocPro.git
cd PandocPro
npm install
./scripts/setup-alias.sh
source ~/.zshrc  # or simply open a new Terminal window
```

You’re ready to go—`dsync` will now work from any folder on your Mac. 🎉

---

## 2. Use It Day to Day

### Option A (recommended): Let the menu guide you

```bash
dsync
```

The on-screen menu will help you:
- 📄 Make an easy-to-edit Markdown copy of a Word file
- 📘 Build a brand-new Word file from your Markdown changes
- 🔄 Keep both versions matched automatically
- 👀 Turn on live updates while you edit (watch mode)
- ✏️ Open the Markdown file in VS Code
- 📂 Open the original Word document

### Option B: Run the commands yourself

```bash
cd /path/to/PandocPro

# Turn a Word file into Markdown
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md to-md

# Turn that Markdown back into Word
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md to-docx

# Let the script decide which version is newer
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md auto

# Build a slide deck (PPTX) from Markdown/HTML
./scripts/docx-sync.sh docs/slides.docx docs/slides.md to-pptx docs/slides.pptx
```

---

## 3. Typical Workflow (copy/paste friendly)

1. Drop your Word document in the `docs/` folder (subfolders are fine).
2. Run `dsync`.
3. Pick your document from the list.
4. Choose “Make a Markdown copy” (option 1).
5. Edit the `.md` file in VS Code.
6. Choose “Create a Word file from my Markdown” (option 2) when you’re happy.
7. Open the refreshed `.docx` in Word for final formatting.

---

## Pro Tips

### 🎯 Live update while you edit
```bash
dsync
# Select your document
# Pick “Live update while I edit” (option 4)
```
Every time you press ⌘S in VS Code, the Word document refreshes automatically.

Want live PPTX exports instead of Word? Run:
```bash
DOCX_FILE=docs/slides.docx MD_FILE=docs/slides.md node watch-md.js --mode=to-pptx
```

### 🎨 Helpful VS Code extensions
- **Markdown All in One** – handy shortcuts
- **Markdown Preview Enhanced** – live preview pane
- **Code Spell Checker** – quick spelling fixes

### 📁 Keep things tidy
```
docs/
├── reports/
│   ├── monthly-report.docx
│   └── monthly-report.md
├── presentations/
│   ├── q4-review.docx
│   └── q4-review.md
└── drafts/
    ├── proposal.docx
    └── proposal.md
```

---

## Troubleshooting

- **“pandoc: command not found”**  
  Run `brew install pandoc`

- **“No .docx files found”**  
  Make sure the Word files are inside the `docs/` folder.

- **Watch mode says packages are missing**  
  Run `cd /path/to/PandocPro && npm install`

---

## Need a Hand?

```bash
dsync
```

The menu is always the fastest way to explore what’s possible. Prefer reading? The full [README](README.md) dives into advanced tips.

---

## Optional Extras

### Claude Desktop + MCP (voice-controlled automation)
Install **Claude Desktop** (Desktop Commander) and copy the YAML from [MCP-INTEGRATION.md](MCP-INTEGRATION.md) into `~/mcp/tools/docsync.yaml`. Restart the app and you can say things like “Convert report.docx to markdown” or “Improve notes.md and export to Word.”

### Pick the AI model you want to use
```bash
./scripts/configure-llm.sh
```
The helper finds Ollama, LM Studio, or llama.cpp if they’re installed, and stores your choice in `config/llm-selection.json` for reuse.
