# Word ↔ Markdown Sync 🚀

PandocPro lets anyone work on Word documents without living inside Word. Drop a `.docx` file in the project, press `dsync`, and follow the friendly menu—no coding knowledge required.

## 👋 What You’ll Need (macOS)

- **Homebrew** – easiest way to install the tools below: [brew.sh](https://brew.sh)
- **Pandoc** – handles the Word ↔ Markdown conversions: `brew install pandoc`
- **Node.js 18+** – powers the “live update” feature: `brew install node`
- **Microsoft Word** – for final polish and sharing
- **Visual Studio Code** – comfortable place to edit: `brew install --cask visual-studio-code`
- *(Optional but recommended)* **WeasyPrint** – enables the new PDF export modes:
  ```bash
  # Pick ONE install path; Homebrew brings the system libs along for macOS.
  brew install weasyprint
  # or, if you prefer pip:
  python3 -m pip install --user weasyprint

  # Tell PandocPro which engine to invoke (add to ~/.zshrc for permanence)
  export DOCSYNC_PDF_ENGINE=weasyprint
  ```
- *(Optional)* **Claude Desktop (Desktop Commander)** – lets AI run the workflow for you
- *(Optional)* **docSync MCP config** – see [MCP-INTEGRATION.md](MCP-INTEGRATION.md) for a copy‑paste YAML snippet

> **Tip:** After cloning the repo, run `npm install` once so watch mode works later.

## ⚡ Get Going in Minutes

1. **Clone the project**
   ```bash
   git clone https://github.com/motacola/PandocPro.git
   cd PandocPro
   ```

2. **Run the guided setup (recommended)**
   ```bash
   ./scripts/setup.sh
   ```
   This checks for Homebrew, Pandoc, Node.js, runs `npm install`, offers to add the `dsync` alias, and can even drop a Desktop launcher—no manual editing required.

   Prefer manual steps?
   ```bash
   npm install
   ./scripts/setup-alias.sh
   source ~/.zshrc  # or open a new terminal window
   ```

3. **Add your documents**
   - Copy `.docx` files into `docs/` (subfolders are fine).
   - The first time, run `dsync` option 1 to create the Markdown twin automatically.

4. **Use the interactive menu**
   ```bash
   dsync
   ```
   Pick a document, choose **Convert → Markdown**, **Export → Word**, **Auto Sync**, **Watch Mode**, etc. The menu explains each action in plain English.

   *(Prefer double-clicking? Run `./scripts/create-launcher.sh`—or say “yes” during `setup.sh`—to place a `Word-Markdown-Sync.command` launcher on your Desktop.)*

5. *(Optional)* **Wire up AI helpers**
   ```bash
   ./scripts/configure-llm.sh
   ```
   The helper detects Ollama/LM Studio/llama.cpp installs or lets you point to any custom HTTP endpoint, then saves the selection for use in MCP workflows.

That’s enough to edit Word docs in VS Code without touching advanced commands. Come back to the menu whenever you need another conversion.

---

## 🌟 Why People Like It

- 📁 **Simple file flow** – Copy Word files into Markdown for editing and back again.
- 💬 **Plain-English prompts** – The menu says what will happen in everyday language.
- 🔄 **One button sync** – Let the tool decide which version is newer and keep both aligned.
- 🖨️ **Multiple exports** – One shortcut spins Markdown/HTML into DOCX, PDF, or web previews.
- 👀 **Live updates** – Turn on watch mode so saving your Markdown instantly refreshes Word.
- 🧰 **VS Code ready** – Tasks and workspace settings are already tuned for Markdown.
- 🤖 **Optional AI assist** – Wire in Claude Desktop or any local LLM in a couple of minutes.
- 🧠 **Local model picker** – Detect and remember whichever AI model you prefer.
- 🖱️ **Drag-and-drop UI** – Prefer browsers to terminals? Launch the new dashboard locally.

## 🆚 Comparison at a Glance

| Scenario | Manual Word-only flow | PandocPro workflow |
| --- | --- | --- |
| **Get a Markdown copy** | Type long Pandoc commands, remember paths | Option 1 clones the doc, logs it, and keeps backups |
| **Keep files aligned** | Manually guess which file is newer | Option 3 auto-detects freshness and syncs safely |
| **Export polished Word** | Re-enter Pandoc flags each time | Option 2 rebuilds the .docx with one shortcut |
| **See live progress** | No built-in watcher | Watch mode streams saves and now shows spinner progress |
| **Recover from mistakes** | Hope you saved a copy somewhere | Undo pulls from automatic backups in `backups/` |
| **Bring in AI helpers** | Hand-roll integrations | `configure-llm.sh` plus MCP tools wire models in minutes |

---

## 🎨 See the New Welcome Experience

Want a fast preview of the refreshed ASCII art welcome screen and menu without running the script? Open `pandocpro.html` in a browser—it includes the before/after comparison plus a render of the terminal experience.

```bash
open pandocpro.html
```

Bring it up in demos or share the file so teammates can see what the first-run flow looks like.

---

## 📖 Usage

### Interactive Menu (Recommended)

```bash
dsync
```

The menu lists your Word files and explains each action in plain English. Pick what you need and it does the rest.

### VS Code Integration

Open the Command Palette (`⇧⌘P`) → "Tasks: Run Task" → Choose:
- **DOCX → MD** – Make a Markdown copy of the selected Word file
- **MD → DOCX** – Build a fresh Word document from your Markdown edits
- **Sync (auto)** – Let the script choose the newer file and copy that over

### Watch Mode

Start watch mode for live updates:
```bash
dsync
# Select document
# Choose "Live update while I edit"
```

Now every time you press ⌘S in VS Code, the matching Word document refreshes automatically. ✨

### New Output Targets

You can now jump straight to PDF or standalone HTML exports without leaving the CLI:

```bash
# Markdown → PDF (uses DOCSYNC_PDF_ENGINE if set, auto-detects otherwise)
./scripts/docx-sync.sh docs/report.docx docs/report.md to-pdf

# Markdown → HTML preview (drops docs/report.html next to your source)
./scripts/docx-sync.sh docs/report.docx docs/report.md to-html

# HTML input → DOCX/PDF
./scripts/docx-sync.sh docs/page.docx docs/page.html to-docx
./scripts/docx-sync.sh docs/page.docx docs/page.html to-pdf docs/page.pdf
```

Inside the interactive menu, tap **P** for PDF or **H** for HTML preview when a Markdown file is selected. If you highlight an `.html` file, you’ll see a purpose-built HTML action sheet (DOCX + PDF + “open in browser”).

---

## 🎯 Typical Workflow

1. Drop your Word doc in `docs/`
2. Run `dsync`
3. Choose “Make a Markdown copy” (option 1)
4. Edit the `.md` file in VS Code (extensions welcome!)
5. Optional: ask the AI helper to tidy things up
6. Choose “Create a Word file from my Markdown” (option 2)
7. Open the refreshed `.docx` in Word for final formatting

## 🌐 Drag-and-Drop Dashboard (Optional)

Prefer a browser-first experience or need a quick REST/MCP hook? Start the bundled Express server:

```bash
npm run ui
# → visit http://localhost:4174
```

Features:
- Drop DOCX, Markdown, or HTML files and tick DOCX/PDF/HTML outputs.
- The server shells into `scripts/docx-sync.sh`, so backups/history/logging all still apply.
- Every job shows download buttons plus a JSON API (`/api/jobs/<id>`) you can call from MCP tools or other apps.

> Tip: use `DOCSYNC_PDF_ENGINE=weasyprint npm run ui` to guarantee the REST bridge uses WeasyPrint for every PDF request.

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
- Prefer a browser? Run `./scripts/build-docs.sh` once, then open `site/index.html` for a polished docs hub.

## ❔ FAQ

Need a fast answer? Check [FAQ.md](FAQ.md) or run the interactive helper:

```bash
./scripts/faq.sh      # browse Q&A, search, and launch AI follow-ups
```

You can also press **F** inside the `dsync` menu to open the same browser, or use the FAQ panel in the GUI for clickable answers.

---

## 🖥️ Desktop GUI (Preview)

Prefer windows and buttons over terminals? A new Electron-based GUI is bundled in `gui/` and already knows how to list your docs, trigger conversions, edit Markdown visually, and show live logs/history.

```bash
npm run gui:dev    # start the Electron + Vite app in dev mode
# In the Electron window:
# 1. Pick a .docx from the dropdown
# 2. Open “Quick settings” to ensure Pandoc/Node are detected and pick the docs folder if it lives elsewhere
# 3. Use the TipTap editor to rewrite Markdown with WYSIWYG controls, save, or “Save & Export”
# 4. Choose an action (Convert, Export, Auto Sync) and click “Run Selected Action”
# 5. Watch stdout/stderr per-run logs, copy them if needed, and review Recent Activity pulled from logs/history.log
```

When you’re ready to distribute the desktop app, build installers with:

```bash
npm run gui:build  # produces DMG + ZIP bundles in gui/release/
npm run gui:package  # same as build, then reveals gui/release/ in Finder
```

To sign/notarize builds on macOS, set these environment variables before running the commands (or configure them in CI):

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
export CSC_NAME="Developer ID Application: YOUR NAME (TEAMID)"
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
```

The GUI now ships with a TipTap-based editor, watch controls, and an environment checklist so teammates never have to touch the terminal once setup is complete. Onboarding wizards remain on the roadmap.

> ℹ️ **CI reminder:** A GitHub Actions workflow (`.github/workflows/gui-build.yml`) builds these artifacts automatically. Be sure to push/sync that workflow from an account/token with `workflow` scope so GitHub accepts the update.

---

**Made with ❤️ for efficient document workflows**

Just type `dsync` and let the magic happen! ✨
