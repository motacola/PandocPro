# 🤖 MCP Integration Guide

**Your docSync workflow is now available as native MCP tools!**

---

## 🎯 What This Means

You can now ask me (Claude) to handle your documents using **natural language**, and I'll automatically use the right tools. No need to remember commands!

---

## 🚀 Available Commands (Just Ask!)

### **Document Discovery**

**"What documents are available?"**
- I'll list all .docx files in your docs folder

**"Show me the files in the docs folder"**
- Lists everything available for conversion

---

### **Conversion**

**"Convert report.docx to markdown"**
- Converts your Word doc for editing in VS Code

**"Turn presentation.docx into markdown"**
- Same thing, natural language!

**"Export notes.md back to Word"**
- Converts markdown back to .docx

**"Create a Word version of summary.md"**
- Export markdown to Word format

---

### **Auto-Sync**

**"Sync presentation files (auto-detect which is newer)"**
- Smart sync based on modification time

**"Update whichever file is older between report.docx and report.md"**
- Automatic detection and sync

---

### **Content Improvement**

**"Read report.md and improve the writing"**
- I'll read, enhance, and update the markdown

**"Polish presentation.md and export to Word"**
- Complete workflow: improve → export

**"Make summary.md more concise and professional, then create the Word version"**
- Multi-step automation

**"Fix spelling and grammar in draft.md, then export"**
- Quality check + export

---

### **Batch Operations**

**"Convert all Word docs in the docs folder to markdown"**
- Processes multiple files

**"Export all markdown files back to Word"**
- Batch export operation

---

### **Watch Mode**

**"Watch notes.md and auto-export to Word when I save"**
- Starts background watcher

**"Set up auto-export for presentation.md"**
- Live sync as you edit

---

## 📋 Complete Tool Reference

| Tool | What I Can Do |
|------|---------------|
| `docSync.listDocuments` | Show available documents |
| `docSync.convertDocxToMd` | Convert Word → Markdown |
| `docSync.exportMdToDocx` | Export Markdown → Word |
| `docSync.syncAuto` | Smart sync (newest wins) |
| `docSync.readMarkdown` | Read and analyze content |
| `docSync.updateMarkdown` | Edit specific sections |
| `docSync.improveAndExport` | Improve content + export |
| `docSync.watchMode` | Auto-export on save |
| `docSync.openMenu` | Launch interactive menu |

---

## 💡 Example Workflows

### **Workflow 1: Quick Conversion**
```
You: "Convert test.docx to markdown"

Me: [Uses docSync.convertDocxToMd]
    "✅ Converted test.docx → test.md
     You can now edit it in VS Code!"
```

### **Workflow 2: Content Improvement**
```
You: "Improve the writing in report.md and export to Word"

Me: [Uses docSync.readMarkdown]
    [Analyzes and improves content]
    [Uses docSync.updateMarkdown]
    [Uses docSync.exportMdToDocx]
    "✅ Enhanced report.md and exported to report.docx"
```

### **Workflow 3: Batch Processing**
```
You: "Convert all my Word docs to markdown"

Me: [Uses docSync.listDocuments]
    [Loops through each file]
    [Uses docSync.convertDocxToMd for each]
    "✅ Converted 5 documents:
     - report.docx → report.md
     - presentation.docx → presentation.md
     - notes.docx → notes.md
     - summary.docx → summary.md
     - draft.docx → draft.md"
```

### **Workflow 4: Smart Editing**
```
You: "The introduction in presentation.md is too wordy. Make it concise."

Me: [Uses docSync.readMarkdown]
    [Finds introduction section]
    [Uses docSync.updateMarkdown to replace it]
    "✅ Tightened the introduction from 3 paragraphs to 1"
```

---

## 🎨 Advanced Use Cases

### **Style Transformations**
- "Make report.md more formal and export"
- "Convert presentation.md to use UK spelling"
- "Rewrite summary.md in active voice"

### **Content Analysis**
- "Summarize the key points in report.md"
- "What's the main message of presentation.md?"
- "Extract action items from notes.md"

### **Quality Assurance**
- "Check draft.md for grammar errors"
- "Find and fix inconsistencies in report.md"
- "Ensure all dates use UK format"

### **Structure Improvements**
- "Add more headings to report.md for better organization"
- "Convert these bullet points to a table"
- "Create a table of contents for presentation.md"

---

## 🔧 Behind the Scenes

When you ask me to help with documents, I:

1. **Understand your intent** from natural language
2. **Choose the right tool** automatically
3. **Execute the operation** using Desktop Commander
4. **Report results** in friendly language
5. **Handle errors gracefully** with suggestions

You don't need to know tool names or parameters!

---

## 📍 File Paths

For best results, use paths like:
- `~/Documents/docx-md-sync/docs/report.docx`
- `docs/presentation.md` (relative to project)
- Or just the filename if it's in the docs folder

I'll figure out the full path automatically!

---

## ⚡ Quick Tips

### **Be Natural**
❌ "Execute docSync.convertDocxToMd with parameter ~/Documents/..."
✅ "Convert my report to markdown"

### **Be Specific**
❌ "Fix the document"
✅ "Fix spelling errors in report.md and export to Word"

### **Ask for Combinations**
✅ "Read presentation.md, improve the bullet points, and export"
✅ "Convert all docs to markdown, then create a summary"

### **Use Context**
If we're already discussing a file:
✅ "Now export it to Word"
✅ "Make it more concise"

---

## 🚨 What I Can't Do (Yet)

- ❌ Modify complex Word formatting (use Word for final polish)
- ❌ Handle images embedded in documents (text only)
- ❌ Edit .docx files directly (always convert to .md first)
- ❌ Undo operations (but originals are preserved!)

---

## 🔄 Integration with Other Workflows

### **With Git**
"Convert report.docx to markdown and commit the changes"

### **With Email**
"Improve draft.md and send me the key points"

### **With Analysis**
"Extract data from report.md and create a summary"

---

## 📚 Learning Path

### **Day 1: Basic Conversions**
- "Convert this Word doc"
- "Export this markdown"

### **Week 1: Content Improvements**
- "Improve the writing"
- "Make it more professional"

### **Week 2: Complex Workflows**
- "Read, improve, and export"
- "Convert all, then summarize"

### **Week 3: Advanced Automation**
- Custom batch operations
- Complex multi-step workflows

---

## 🎯 Best Practices

### **1. Always Preview Before Export**
Ask me to show you changes before exporting:
- "Show me the improved version first"
- "Let me review before you export"

### **2. Be Specific About Style**
- "UK spelling" not just "spelling"
- "Active voice" not just "better"
- "Formal tone" not just "professional"

### **3. Work Iteratively**
- First: "Convert to markdown"
- Then: "Improve section 2"
- Finally: "Export to Word"

### **4. Use Watch Mode Wisely**
Only for active editing sessions:
- "Start watch mode for presentation.md"
- [Edit and save multiple times]
- "Stop watching"

---

## 🆘 Troubleshooting

### **"I can't find that file"**
→ Use full path or ask me to list available documents

### **"The conversion failed"**
→ Check if the file is a valid Word document
→ Make sure it's not open in Word

### **"Watch mode isn't working"**
→ Make sure npm dependencies are installed
→ Try: "cd ~/Documents/docx-md-sync && npm install"

---

## 🎉 Try It Now!

Ask me anything like:
- "What documents do I have?"
- "Convert test.docx to markdown"
- "Improve the writing in presentation.md"
- "Export summary.md to Word"

**I'm ready to help!** 🚀

---

## 📖 Related Documentation

- **MCP YAML**: `~/mcp/tools/docsync.yaml` (the configuration)
- **Tool Scripts**: `~/Documents/docx-md-sync/scripts/`
- **Main Docs**: See `INDEX.md` for complete documentation

---

**Remember:** Just describe what you want in plain English, and I'll handle the technical details! ✨
