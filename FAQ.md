# ❔ Frequently Asked Questions

Quick answers when you just want to keep working—no deep dive required.

> **Need it interactive?** Run `./scripts/faq.sh` (or press **F** in the `dsync` menu) to search this FAQ and ask follow-ups with your AI helper.

## 🧰 Setup & Requirements

**Q: What do I need installed before I run PandocPro?**  
Install Homebrew, then run:

```bash
brew install pandoc node
./scripts/setup.sh    # runs npm install, adds the dsync alias, offers the desktop launcher
```

Pandoc handles the Docx/Markdown conversions, Node powers watch mode + the GUI, and Microsoft Word/VS Code let you edit comfortably.

**Q: Where should I put my Word documents?**  
Anywhere under `docs/` (subfolders are fine). The menu and GUI look there by default, or whatever folder you pick in Settings → “Docs folder.”

**Q: Can I keep documents somewhere else?**  
Yes. GUI: Quick settings → “Docs folder” → Change…. CLI: run from the repo root so `dsync` sees `docs/`, or symlink your preferred folder into `docs/`.

## 📄 Menu & Conversions

**Q: The menu can’t see my document. What should I check?**  
Make sure it’s `.docx`, lives under `docs/`, and you ran `dsync` from the project folder. The banner shows ⭐ quick picks—type the number if you see it there.

**Q: When do I use Convert vs Auto Sync?**  
- **Convert to Markdown** (1): first time from Word → VS Code.  
- **Export to Word** (2): when you’re done editing Markdown.  
- **Auto Sync** (3): newest file wins; great when you bounce between Word and Markdown.

**Q: Where do backups and logs live?**  
`logs/history.log` for every run, `backups/` for timestamped safety copies. Menu option 8 (“Undo the last thing I did”) restores the last backup.

## 👀 Watch Mode & Live Editing

**Q: Why does watch mode complain about npm?**  
Install Node (`brew install node`), run `npm install` once in the repo, and make sure the `.md` twin exists. The menu will auto-create it before starting watch mode.

**Q: Can I stop watch mode without closing the menu?**  
Yes—press `Ctrl+C` in the terminal that started watch mode. Your quick picks and history stay intact.

## 🖥️ GUI & Automation

**Q: Is there a desktop app?**  
Yes. From repo root: `npm run gui:dev`. It shows your docs, live logs, watch controls, and a Markdown/preview editor. `npm run gui:build` creates a DMG in `gui/release/`.

**Q: How do I turn on AI help (in-app or any MCP client)?**  
1) Run `./scripts/configure-llm.sh` and pick your model (Ollama, LM Studio, llama.cpp, or custom/OpenAI-style). This writes `config/llm-selection.json`.  
2) Start your model server.  
3) Want MCP?  
   ```bash
   ./scripts/install-mcp.sh
   # export PROJECT_ROOT="/absolute/path/to/docx-md-sync"  # only if your client launches elsewhere
   ```  
   Restart/reload your MCP client.  
After that, in-app AI and `docSync.applyAiEdit` use the same model.

**Q: Which MCP clients do you recommend (with install links)?**  
- Claude Desktop (Desktop Commander): https://www.anthropic.com/claude-desktop  
- Context7: https://context7.com/  
- VS Code MCP client: https://marketplace.visualstudio.com/  
- More clients: https://modelcontextprotocol.io/  
Install the client, run `./scripts/install-mcp.sh`, set `PROJECT_ROOT` if you launch outside the repo, then restart so it picks up docSync.

## 🛠️ Troubleshooting

**Q: Pandoc failed with a cryptic error. What now?**  
Check the paths, close the file in Word, and try `brew upgrade pandoc`. You can rerun the exact command: `./scripts/docx-sync.sh path/to/file.docx path/to/file.md to-md`.

**Q: I renamed or moved a document and history looks wrong.**  
Run `dsync` to refresh. If the file left `docs/`, move it back or point the GUI to the new folder. Conversions recreate missing Markdown twins automatically.

**Q: How do I reset after a mistake?**  
Menu option 8 undoes the last conversion (restores the backup or removes the new file). For manual recovery, use `logs/history.log` to find the backup.

**Q: Where can I see what changed?**  
`logs/history.log` or GUI → “Recent activity” shows timestamps, mode, paths, and notes for each run.

Have a question that isn’t covered here? Open an issue or drop it into `IMPROVEMENTS.md` so we can expand this FAQ.
