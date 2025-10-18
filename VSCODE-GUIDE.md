# 🎨 VS Code Integration Guide

## Setup VS Code for Optimal Markdown Editing

### Recommended Extensions

Open VS Code and install these (or let the workspace suggest them):

1. **Markdown All in One** (`yzhang.markdown-all-in-one`)
   - Keyboard shortcuts, table of contents, auto preview
   
2. **Markdown Preview Enhanced** (`shd101wyy.markdown-preview-enhanced`)
   - Live preview with scroll sync
   
3. **Code Spell Checker** (`streetsidesoftware.code-spell-checker`)
   - Catch typos before exporting

### Quick Install Command

```bash
code --install-extension yzhang.markdown-all-in-one
code --install-extension shd101wyy.markdown-preview-enhanced
code --install-extension streetsidesoftware.code-spell-checker
```

---

## Using VS Code Tasks

### Open Command Palette
- Mac: `⇧⌘P`
- Type: "Tasks: Run Task"

### Available Tasks

1. **DOCX → MD** - Convert Word to Markdown
2. **MD → DOCX** - Export Markdown to Word
3. **Sync (auto)** - Smart sync based on modification time

### Set Up Keyboard Shortcuts

1. Open Keyboard Shortcuts: `⌘K ⌘S`
2. Search for "Run Task"
3. Add your preferred shortcut
4. Example: `⌘⇧M` for "DOCX → MD"

---

## Workspace Features

Open the workspace file for enhanced experience:

```bash
open /path/to/PandocPro/docx-sync.code-workspace
```

**What you get:**
- ✅ Word wrap enabled by default
- ✅ Format on save
- ✅ Better preview settings
- ✅ Hidden system files
- ✅ Extension recommendations

---

## Live Preview

While editing Markdown:

1. Press `⌘K V` to open preview side-by-side
2. Or click the preview icon in the top right
3. Preview updates as you type!

---

## Markdown Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘B` | Bold |
| `⌘I` | Italic |
| `⌥⇧F` | Format table |
| `⌘⇧V` | Open preview |
| `⌘K V` | Open preview to side |

---

## Tips for Better Editing

### 1. Use Snippets
Type `table` and press Tab → instant Markdown table!

### 2. Paste as Markdown
Copy from web, paste into VS Code → auto-formatted!

### 3. Outline View
Click the outline icon in sidebar → navigate by headings

### 4. Multi-Cursor Editing
`⌘D` to select next occurrence
`⌥⌘↓` to add cursor below

---

## Integrated Terminal

Run sync commands without leaving VS Code:

1. Open terminal: `` ⌃` ``
2. Run: `dsync`
3. Or use tasks (faster!)

---

## Git Integration

The project is already initialized with Git:

1. **View changes**: Click Source Control icon (sidebar)
2. **Stage changes**: Click `+` next to files
3. **Commit**: Type message, press `⌘Enter`

**Recommended commits:**
```bash
git add docs/report.md docs/report.docx
git commit -m "Update quarterly report"
```

---

## Watch Mode + VS Code

Perfect combo:

1. Start watch mode in terminal
2. Edit .md file in VS Code
3. Save → Word doc updates automatically
4. Check Word doc → see your changes!

---

## Advanced: Custom Tasks

Edit `.vscode/tasks.json` to add your own tasks:

```json
{
  "label": "Export All",
  "type": "shell",
  "command": "for f in docs/*.md; do ./scripts/docx-sync.sh \"${f%.md}.docx\" \"$f\" to-docx; done"
}
```

---

## Troubleshooting

**Tasks not showing?**
- Reload VS Code: `⇧⌘P` → "Reload Window"

**Preview not working?**
- Install Markdown extensions
- Check extension recommendations in workspace

**Can't run shell scripts?**
- Make sure you're in the project folder
- Check script has execute permissions

---

## Next Steps

1. Open workspace: `docx-sync.code-workspace`
2. Install recommended extensions
3. Set up keyboard shortcuts for tasks
4. Start editing!

Happy editing! ✨
