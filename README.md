# Word ↔ Markdown Sync 🚀

The easiest way to edit Word documents in VS Code with full automation support.

## ⚡ Quick Start

1. **One-time setup** (creates `dsync` command):
   ```bash
   cd ~/Documents/docx-md-sync
   ./scripts/setup-alias.sh
   source ~/.zshrc  # or restart terminal
   ```

2. **Add your Word documents** to the `docs/` folder

3. **Run the interactive menu**:
   ```bash
   dsync
   ```

That's it! 🎉

---

## ✨ Features

- 📄 **Convert Word → Markdown** for editing in VS Code
- 📘 **Export Markdown → Word** with one command
- 🔄 **Auto-sync** - smart detection of which file is newer
- 👀 **Watch mode** - auto-exports on save
- 🎨 **Interactive menu** - no need to remember commands
- 🛠️ **VS Code tasks** - keyboard shortcuts for conversions
- 🤖 **MCP integration** - use with Desktop Commander for AI assistance

---

## 📖 Usage

### Interactive Menu (Recommended)

```bash
dsync
```

You'll see a beautiful menu:
- Select your document from a list
- Choose what you want to do
- Everything happens automatically

### VS Code Integration

Open the Command Palette (`⇧⌘P`) → "Tasks: Run Task" → Choose:
- **DOCX → MD** - Convert to Markdown
- **MD → DOCX** - Export to Word
- **Sync (auto)** - Smart sync

### Watch Mode

Start watch mode for live updates:
```bash
dsync
# Select document
# Choose "4) Watch mode"
```

Now every save in VS Code updates your Word doc! ✨

---

## 🎯 Typical Workflow

1. Drop your Word doc in `docs/`
2. Run `dsync`
3. Convert to Markdown
4. Edit in VS Code (with all your extensions!)
5. Use MCP tools for AI-powered improvements
6. Export back to Word
7. Polish formatting in Word

---

## 🤖 Automation with Desktop Commander

Ask me (Claude) to help you:

**Examples:**
- "Convert my report to markdown"
- "Improve the bullet points and export to Word"
- "Summarize the presentation and create talking points"
- "Fix spelling and grammar, then export"

I can read, edit, and convert your documents automatically!

---

## 📁 Project Structure

```
docx-md-sync/
├── docs/               # Put your Word docs here
│   ├── *.docx         # Word documents
│   └── *.md           # Generated Markdown files
├── scripts/
│   ├── menu.sh        # Interactive menu
│   ├── docx-sync.sh   # Core conversion script
│   └── setup-alias.sh # Alias installer
├── sync               # Quick launcher
└── QUICKSTART.md      # Detailed guide
```

---

## 🔧 Advanced Usage

### Direct Commands

```bash
cd ~/Documents/docx-md-sync

# Convert specific file
./scripts/docx-sync.sh docs/report.docx docs/report.md to-md

# Export specific file
./scripts/docx-sync.sh docs/report.docx docs/report.md to-docx
```

### Custom File Locations

The menu automatically finds all .docx files in `docs/`, but you can organize them:

```
docs/
├── reports/
├── presentations/
└── drafts/
```

---

## 💡 Pro Tips

1. **Keep watch mode running** while editing for instant updates
2. **Use VS Code extensions** for better Markdown editing
3. **Commit both files** (.docx and .md) to Git
4. **Use MCP tools** for AI-powered content improvements
5. **Let Word handle** complex formatting and styling

---

## 📦 What's Included

✅ Pandoc installed and configured  
✅ Interactive menu system  
✅ VS Code tasks and workspace  
✅ Auto-watcher with live updates  
✅ Git integration  
✅ Shell alias for quick access  
✅ MCP-ready for automation  

---

## 🆘 Troubleshooting

**Command not found: dsync**
```bash
source ~/.zshrc  # or restart terminal
```

**No documents showing in menu**
- Put .docx files in the `docs/` folder

**Watch mode errors**
```bash
cd ~/Documents/docx-md-sync && npm install
```

---

## 📚 Documentation

- **QUICKSTART.md** - Step-by-step guide
- **README.md** - This file
- VS Code tasks - Press `⇧⌘P` → "Tasks: Run Task"

---

**Made with ❤️ for efficient document workflows**

Just type `dsync` and let the magic happen! ✨
