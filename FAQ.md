# ❔ Frequently Asked Questions

Quick answers when you're in the middle of a conversion and don't want to dig through every guide.

> **Need it interactive?** Run `./scripts/faq.sh` (or press **F** in the `dsync` menu) to browse this FAQ in your terminal, search by keyword, and send follow-up questions to your configured AI helper.

## 🧰 Setup & Requirements

**Q: What do I need installed before I run PandocPro?**  
Install Homebrew, then run:

```bash
brew install pandoc node
./scripts/setup.sh    # runs npm install, adds the dsync alias, offers the desktop launcher
```

Pandoc handles the Docx/Markdown conversions, Node powers watch mode + the GUI, and Microsoft Word/VS Code let you edit comfortably.

**Q: Where should I put my Word documents?**  
Drop them anywhere inside the `docs/` folder (subdirectories are fine). The menu crawls that tree every run, and the GUI uses the same folder (or whichever folder you pick in Settings → “Docs folder”).

**Q: Can I keep documents somewhere else?**  
Yes. For the GUI, open Quick settings → “Docs folder” → `Change…` and select a new directory. For the CLI, launch from the repo root so `dsync` still finds `docs/`, or symlink your preferred folder into `docs/`.

## 📄 Menu & Conversions

**Q: The menu can’t see my document. What should I check?**  
Confirm the file ends with `.docx` (not `.doc`), that it lives under `docs/`, and that you ran `dsync` from the project folder so the script has the right working directory. The banner now prints ⭐ “Quick picks” for your recent files—if a document appears there, just type its number instead of scrolling.

**Q: When do I use Convert vs Auto Sync?**  
Use **Convert to Markdown** (option 1) the first time you bring a Word file into VS Code. Use **Export to Word** (option 2) once you’re done editing Markdown. **Auto Sync** (option 3) compares modification times and copies the newer file over the older one—handy when you alternate edits between Word and Markdown.

**Q: Where do backups and logs live?**  
Every conversion appends a line to `logs/history.log` and stores a timestamped backup in `backups/`. Option 8 (“Undo the last thing I did”) reads those entries so you can roll back a bad export.

## 👀 Watch Mode & Live Editing

**Q: Why does watch mode complain about npm?**  
Watch mode runs the Node-based file watcher in `watch-md.js`. Install Node (`brew install node`), run `npm install` once in the repo, and make sure the Markdown twin exists. The menu now helps by creating the `.md` file automatically before starting watch mode.

**Q: Can I stop watch mode without closing the menu?**  
Yes. Press `Ctrl+C` in the terminal that started watch mode. Your conversions and quick picks remain logged for next time.

## 🖥️ GUI & Automation

**Q: Is there a desktop app yet?**  
Yes—open `gui/` and run `npm run gui:dev`. The preview app lists the same documents, streams conversion logs, offers watch controls, and includes a TipTap-based editor with Markdown preview. Packaging via `npm run gui:build` produces a DMG in `gui/release/`.

**Q: How do I bring AI into the workflow?**  
Run `./scripts/configure-llm.sh` to detect local runtimes (Ollama, LM Studio, llama.cpp, custom HTTP endpoint). The script saves `config/llm-selection.json`, which the MCP tools and GUI use to route AI-powered edits. For Claude Desktop, drop the provided YAML into `~/mcp/tools/docsync.yaml` and restart.

## 🛠️ Troubleshooting

**Q: Pandoc failed with a cryptic error. What now?**  
The conversion script now prints spinner progress, the raw Pandoc error, and practical tips. Make sure the source file exists, isn’t locked by Word, and try running `brew upgrade pandoc`. You can rerun the same command manually: `./scripts/docx-sync.sh path/to/file.docx path/to/file.md to-md`.

**Q: I renamed or moved a document and history looks wrong.**  
Run `dsync` again so it refreshes the file list. If you moved the file outside `docs/`, either move it back or update the GUI docs folder setting. Conversions automatically recreate missing Markdown twins.

**Q: How do I reset after a mistake?**  
Use menu option 8 to undo the last successful conversion. It restores the backup (if one exists) or removes the newly created target file. For manual recovery, check the latest entry in `logs/history.log` to locate the exact backup file.

**Q: Where can I see what changed?**  
Open `logs/history.log` or use GUI → “Recent activity.” Timestamps, modes, source/target paths, and notes appear there so you can trace who converted what.

Have a question that isn’t covered here? Open an issue or drop it into `IMPROVEMENTS.md` so we can expand this FAQ.
