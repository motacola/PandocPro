# 🚀 Quick Start Guide

## Super Simple Setup (One-Time)

Run this once to set up a global command:

```bash
cd ~/Documents/docx-md-sync
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
cd ~/Documents/docx-md-sync

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
cd ~/Documents/docx-md-sync
npm install
```

---

## Getting Help

Run the menu and explore the options:
```bash
dsync
```

Or check the full README.md for advanced usage.
