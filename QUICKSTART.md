# 🚀 Quick Start Guide

## Super Simple Setup (One-Time)

Clone the repo wherever you like and set up the helper command:

```bash
git clone https://github.com/motacola/PandocPro.git
cd PandocPro
npm install
./scripts/setup-alias.sh
source ~/.zshrc  # or open a new terminal
```

Now you can just type `dsync` from anywhere! 🎉

---

## Daily Usage

### Option 1: Interactive Menu (Recommended)

Just run:
```bash
dsync
```

You'll see a friendly menu that lets you:
- 📄 Convert Word → Markdown
- 📘 Export Markdown → Word  
- 🔄 Auto-sync (smart detection)
- 👀 Watch mode (auto-save)
- ✏️ Edit in VS Code
- 📂 Open Word document

### Option 2: Direct Commands

```bash
cd /path/to/PandocPro

# Convert Word to Markdown
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md to-md

# Export Markdown to Word
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md to-docx

# Auto-sync (newest file wins)
./scripts/docx-sync.sh docs/yourfile.docx docs/yourfile.md auto
```

---

## Typical Workflow

1. **Drop your Word doc** in the `docs/` folder
2. **Run** `dsync`
3. **Select** your document from the list
4. **Choose** "Convert to Markdown"
5. **Edit** the .md file in VS Code
6. **Choose** "Export to Word" when done
7. **Open** the .docx in Word for final polish

---

## Pro Tips

### 🎯 Use Watch Mode
While editing, start watch mode so your Word doc updates automatically:
```bash
dsync
# Select document
# Choose "4) Watch mode"
```

Now every time you save the Markdown, the Word doc updates!

### 🎨 VS Code Extensions
Install these for better Markdown editing:
- Markdown All in One
- Markdown Preview Enhanced
- Code Spell Checker

### 📁 Organize Your Docs
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

**"pandoc: command not found"**
```bash
brew install pandoc
```

**"No .docx files found"**
- Make sure your Word documents are in the `docs/` folder
- The script looks for *.docx files there

**Watch mode not working**
```bash
cd /path/to/PandocPro && npm install
```

---

## Getting Help

Run the menu and explore the options:
```bash
dsync
```

Or check the full README.md for advanced usage.

---

## Optional: Claude Desktop + MCP Automation

Want Claude to run the scripts for you? Install **Claude Desktop** (Desktop Commander) and copy the MCP configuration from [MCP-INTEGRATION.md](MCP-INTEGRATION.md) into `~/mcp/tools/docsync.yaml`, then restart the app. After that you can ask Claude things like “Convert report.docx to markdown” or “Improve notes.md and export to Word” and it will invoke the right tools automatically.

---

## Optional: Pick Your Local LLM

Prefer running your own model? Detect what's already installed:

```bash
./scripts/configure-llm.sh
```

You'll get a menu with any local runtimes (Ollama, LM Studio, llama.cpp, etc.) and a custom option. The selection is saved to `config/llm-selection.json` so you can reuse it in MCP configs or other automation scripts.
