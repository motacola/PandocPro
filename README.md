# Word ↔ Markdown Sync 🚀

The easiest way to edit Word documents in VS Code with full automation support.

## 🛠️ macOS Prerequisites

- **Homebrew** (recommended) – install from [brew.sh](https://brew.sh) to use the commands below.
- **Pandoc** – required for every conversion: `brew install pandoc`
- **Node.js 18+ (includes npm)** – needed for watch mode and menu automation: `brew install node`
- **Microsoft Word** – for final formatting and review
- **Visual Studio Code** – recommended editor: `brew install --cask visual-studio-code`
- *(Optional, for AI automation)* **Claude Desktop (Desktop Commander)** – enables the `docSync` MCP tools described below; grab the macOS app from [anthropic.com/desktop](https://www.anthropic.com/desktop)
- *(Optional, for AI automation)* **docSync MCP configuration** – copy the provided YAML into `~/mcp/tools/docsync.yaml` so Claude can call these scripts (see [MCP-INTEGRATION.md](MCP-INTEGRATION.md) for the exact snippet and walkthrough)

After cloning the repo, run `npm install` once inside the project folder to download the watcher dependencies.

## ⚡ Quick Start

1. **Clone & enter the project**
   ```bash
   git clone https://github.com/motacola/PandocPro.git
   cd PandocPro
   ```

2. **Install JavaScript dependencies** (watch mode)
   ```bash
   npm install
   ```

3. **One-time setup** (creates `dsync` command):
   ```bash
   ./scripts/setup-alias.sh
   source ~/.zshrc  # or restart terminal
   ```

4. **Add your Word documents** to the `docs/` folder

5. **Run the interactive menu**:
   ```bash
   dsync
   ```

6. *(Optional)* **Configure your AI assistant**:
   ```bash
   ./scripts/configure-llm.sh
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
- 🧠 **Local LLM chooser** - auto-detect Ollama, LM Studio, llama.cpp, or custom endpoints

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

## 🤖 MCP Automation Setup (Optional)

Want to drive everything through Claude Desktop? Set up the `docSync` MCP once:

1. Install **Claude Desktop for macOS** and enable **Desktop Commander** in the app preferences.
2. Create `~/mcp/tools/docsync.yaml` and paste the configuration from [MCP-INTEGRATION.md](MCP-INTEGRATION.md) (the YAML registers every `docSync.*` tool shown above).
3. Restart Claude Desktop so it discovers the new MCP tool suite.

After that you can ask Claude things like “Convert report.docx to markdown”, “Improve presentation.md and export to Word”, or “Start watch mode for notes.md” and it will invoke the right commands automatically.

---

## 🧠 Configure Your Local LLM (Optional)

Prefer running your own models? Use the helper to discover what's on your Mac:

```bash
./scripts/configure-llm.sh
```

The script will:
- Detect installs such as **Ollama**, **LM Studio**, or **llama.cpp**
- Let you register any custom HTTP endpoint
- Save your choice to `config/llm-selection.json` for reuse
- *(Optional)* Install `jq` (`brew install jq`) for a pretty summary after the script runs

Reference that JSON file when wiring up MCP configs, VS Code extensions, or other automations so they call the model you prefer.

---

## 📁 Project Structure

```
PandocPro/
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
cd /path/to/PandocPro

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
cd /path/to/PandocPro && npm install
```

---

## 📚 Documentation

- **QUICKSTART.md** - Step-by-step guide
- **README.md** - This file
- VS Code tasks - Press `⇧⌘P` → "Tasks: Run Task"

---

**Made with ❤️ for efficient document workflows**

Just type `dsync` and let the magic happen! ✨
