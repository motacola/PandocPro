# PandocPro AI Integration Guide 🤖

> **Quick Reference for AI Assistants to Control PandocPro**

## Installation Paths

- **GUI App**: `/Applications/PandocPro.app`
- **CLI Project**: `/Users/christopherbelgrave/Documents/docx-md-sync/`
- **Documents**: `/Users/christopherbelgrave/Documents/docx-md-sync/docs/`

## Two Control Methods

### 1. GUI (Electron App)
Launch: `open -a "PandocPro"`

**Features:**
- Drag-and-drop interface
- Batch conversions
- Live watch mode
- AI-powered improvements
- Visual dashboard

### 2. CLI (Command Line)
Base: `cd /Users/christopherbelgrave/Documents/docx-md-sync`

**Features:**
- Quick conversions
- Scriptable automation
- Direct file manipulation
- Minimal overhead

## Quick Commands

### GUI Control
```bash
# Launch app
open -a "PandocPro"

# Check if running
ps aux | grep PandocPro
```

### CLI Conversions
```bash
cd /Users/christopherbelgrave/Documents/docx-md-sync

# Word → Markdown
./scripts/docx-sync.sh docs/FILE.docx docs/FILE.md to-md

# Markdown → Word
./scripts/docx-sync.sh docs/FILE.docx docs/FILE.md to-docx

# Auto-sync (newest wins)
./scripts/docx-sync.sh docs/FILE.docx docs/FILE.md auto

# PowerPoint
./scripts/docx-sync.sh docs/FILE.docx docs/FILE.md to-pptx docs/FILE.pptx

# PDF
./scripts/docx-sync.sh docs/FILE.docx docs/FILE.md to-pdf docs/FILE.pdf

# Interactive menu
dsync
```

### Live Sync
```bash
cd /Users/christopherbelgrave/Documents/docx-md-sync
DOCX_FILE=docs/FILE.docx MD_FILE=docs/FILE.md node watch-md.js
```

## AI Workflow Patterns

### Pattern 1: Quick Edit
```
User: "Edit my CV"
→ Convert to Markdown
→ Open in editor
→ Convert back to Word
```

### Pattern 2: Batch Operations
```
User: "Convert all documents"
→ Launch GUI
→ Use batch convert
→ Show dashboard
```

### Pattern 3: AI Content Improvement
```
User: "Improve report and export"
→ Read markdown
→ Process with AI
→ Write improved version
→ Convert to Word
```

### Pattern 4: Multi-Format Export
```
User: "I need PDF and PowerPoint"
→ Convert to PDF
→ Convert to PPTX
→ Report file locations
```

## Decision Tree

**Visual feedback needed?** → GUI  
**Batch operations?** → GUI  
**Quick conversion?** → CLI  
**Content improvement?** → Read → AI → Write → Convert  
**Live editing?** → Watch mode (GUI or CLI)  
**Automation?** → CLI  

## Current Documents

- `Christopher_Belgrave_CV_March_2025.docx` (28KB)
- `presentation.docx` (11KB)
- `test.docx` (11KB)

## Best Practices

1. Always navigate to project root first
2. Use absolute paths
3. Verify files exist before operations
4. Check exit codes/IPC responses
5. Offer helpful next steps
6. Handle errors gracefully

## Common User Requests

| User Says | AI Does |
|-----------|---------|
| "Edit my CV" | Convert to MD → Open editor → Offer to convert back |
| "Convert to PowerPoint" | Run to-pptx conversion → Report location |
| "Set up live editing" | Start watch mode → Monitor changes |
| "Improve my report" | Read → AI process → Write → Convert |
| "I need a PDF" | Run to-pdf conversion → Show location |

## Error Handling

```bash
# Check Pandoc installed
which pandoc || brew install pandoc

# Verify permissions
chmod +x scripts/docx-sync.sh

# Check file existence
ls -la docs/FILE.docx

# Source aliases
source ~/.zshrc
```

## Remember

✅ Use GUI for visual/batch operations  
✅ Use CLI for quick/automated tasks  
✅ Always cd to project root  
✅ Verify files exist  
✅ Offer next steps  
✅ Handle errors gracefully  

---

**For complete details, see artifacts or full documentation.**
