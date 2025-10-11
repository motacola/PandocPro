# 📊 Visual Workflow Guide

## The Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📄 Your Word Document (presentation.docx)                 │
│     ↓                                                       │
│     │ dsync → "Convert to Markdown"                        │
│     ↓                                                       │
│  📝 Markdown File (presentation.md)                        │
│     ↓                                                       │
│     │ Edit in VS Code                                      │
│     │ - Use extensions                                     │
│     │ - AI improvements                                    │
│     │ - Version control                                    │
│     ↓                                                       │
│  ✨ Enhanced Markdown                                       │
│     ↓                                                       │
│     │ dsync → "Export to Word"                             │
│     ↓                                                       │
│  📘 Updated Word Document                                   │
│     ↓                                                       │
│     │ Polish in Word                                       │
│     ↓                                                       │
│  🎯 Final Professional Document                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Access Points

```
┌──────────────────────────────────────────┐
│                                          │
│  💻 Terminal      → type: dsync          │
│  🖥️  Desktop      → double-click icon     │
│  ⌨️  VS Code      → ⇧⌘P → Run Task       │
│  🤖 Claude        → ask for help         │
│                                          │
└──────────────────────────────────────────┘
```

---

## Interactive Menu Flow

```
dsync
  ↓
┌────────────────────────────────────────┐
│  📄 Available Documents                │
│  1) presentation.docx                  │
│  2) report.docx                        │
│  3) proposal.docx                      │
└────────────────────────────────────────┘
  ↓ (Select number)
┌────────────────────────────────────────┐
│  What would you like to do?            │
│  1) 📄 Convert to Markdown             │
│  2) 📘 Export to Word                  │
│  3) 🔄 Auto-sync                       │
│  4) 👀 Watch mode                      │
│  5) ✏️  Edit in VS Code                │
│  6) 📂 Open Word                       │
└────────────────────────────────────────┘
  ↓ (Select action)
✨ Task completed!
```

---

## File Organization

```
~/Documents/docx-md-sync/
│
├── 📁 docs/                    ← Your documents go here
│   ├── 📄 report.docx
│   ├── 📝 report.md
│   ├── 📄 presentation.docx
│   └── 📝 presentation.md
│
├── 📁 scripts/
│   ├── 🚀 menu.sh             ← Interactive menu
│   ├── 🔄 docx-sync.sh        ← Conversion engine
│   ├── ⚙️  setup-alias.sh      ← Install dsync command
│   └── 👋 welcome.sh          ← First-run greeting
│
├── 📁 .vscode/
│   └── ⚙️  tasks.json          ← VS Code shortcuts
│
├── 📚 Documentation
│   ├── QUICKSTART.md
│   ├── CHEATSHEET.md
│   ├── INDEX.md
│   ├── VSCODE-GUIDE.md
│   └── MCP-AUTOMATION.md
│
└── 🚀 sync                     ← Quick launcher
```

---

## Watch Mode Flow

```
Start Watch Mode
    ↓
┌─────────────────────────────────────┐
│  👀 Watching: presentation.md       │
│  📘 Will export to: presentation.docx│
└─────────────────────────────────────┘
    ↓
Edit file in VS Code
    ↓
Save (⌘S)
    ↓
┌─────────────────────────────────────┐
│  ✏️  Change detected!                │
│  🔄 Exporting to Word...            │
│  ✅ Export complete!                │
└─────────────────────────────────────┘
    ↓
Repeat as needed
    ↓
Ctrl+C to stop
```

---

## VS Code Integration

```
┌─────────────────────────────────────────────┐
│  VS Code                                    │
│  ┌───────────────────────────────────────┐ │
│  │  presentation.md                      │ │
│  │                                       │ │
│  │  # My Presentation                    │ │
│  │                                       │ │
│  │  ## Introduction                      │ │
│  │  - Point 1                            │ │
│  │  - Point 2                            │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Press ⇧⌘P                                  │
│  ↓                                          │
│  "Tasks: Run Task"                          │
│  ↓                                          │
│  Select: "MD → DOCX"                        │
│  ↓                                          │
│  ✅ presentation.docx updated!               │
└─────────────────────────────────────────────┘
```

---

## AI Automation Flow

```
You: "Polish my report and export to Word"
         ↓
┌─────────────────────────────────────────┐
│  Claude (MCP)                           │
│                                         │
│  1. Read docs/report.md                 │
│  2. Improve writing quality             │
│  3. Fix formatting                      │
│  4. Run export script                   │
│                                         │
│  ✅ Done! Check docs/report.docx        │
└─────────────────────────────────────────┘
```

---

## Decision Tree: Which Tool to Use?

```
                    Need to convert?
                         │
         ┌───────────────┼───────────────┐
         │               │               │
      One file      Multiple files    Routine task
         │               │               │
         ↓               ↓               ↓
    Run: dsync    Use: VS Code Tasks   Set up: Watch mode
         │               │               │
         ↓               ↓               ↓
  Interactive     Keyboard          Auto-export
     menu          shortcuts         on save
```

---

## Feature Comparison

```
┌────────────────────────────────────────────────────────────┐
│  Method          │ Speed  │ Ease  │ Best For              │
├────────────────────────────────────────────────────────────┤
│  dsync           │ ⚡⚡    │ ⭐⭐⭐ │ First-time users      │
│  VS Code Tasks   │ ⚡⚡⚡  │ ⭐⭐   │ Regular editing       │
│  Watch Mode      │ ⚡⚡⚡  │ ⭐⭐⭐ │ Active sessions       │
│  Direct Script   │ ⚡⚡⚡  │ ⭐     │ Automation/scripts    │
│  Claude (MCP)    │ ⚡⚡    │ ⭐⭐⭐ │ Content improvement   │
└────────────────────────────────────────────────────────────┘
```

---

## Success Indicators

```
✅ All Green Checkmarks in test-setup.sh
✅ dsync command works from any directory
✅ Desktop launcher created
✅ VS Code tasks appear in Command Palette
✅ Test conversion completes successfully
✅ Documentation accessible and clear
```

---

## Quick Reference Commands

```
╔════════════════════════════════════════════════════╗
║  Command                  │  What It Does          ║
╠════════════════════════════════════════════════════╣
║  dsync                    │  Open interactive menu ║
║  source ~/.zshrc          │  Activate alias        ║
║  ./sync                   │  Direct launcher       ║
║  ./test-setup.sh          │  Test installation     ║
║  cd ~/Documents/docx...   │  Go to project         ║
║  npm run watch            │  Start watch mode      ║
╚════════════════════════════════════════════════════╝
```

---

## Troubleshooting Map

```
        Problem?
            │
    ┌───────┼───────┐
    │       │       │
  dsync   Watch   Convert
  fails   broken   error
    │       │       │
    ↓       ↓       ↓
 source  npm     Check
 .zshrc  install  file
```

---

## Next Steps Visual

```
   Start Here
      ↓
   QUICKSTART.md
      ↓
   Try dsync
      ↓
   ┌─────────┬─────────┐
   │         │         │
   Easy?   Want more   Love it?
   │         │         │
   ↓         ↓         ↓
   Use it!  VS Code   Automate
            Guide     with MCP
```

---

**Tip:** Keep this open while learning the tool! 📖
