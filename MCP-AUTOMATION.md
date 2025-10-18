# 🤖 MCP Automation Guide

Use Claude (Desktop Commander) to automate your document workflow!

---

## What You Can Ask

### Document Conversion

**"Convert my report to markdown"**
I'll find your .docx file and convert it to .md for editing.

**"Export the presentation back to Word"**
I'll convert the .md file back to .docx format.

---

## Content Improvement

### Polish & Refine

**"Improve the writing in presentation.md"**
- Tighten language
- Fix grammar
- Improve clarity
- Maintain structure

**"Make the tone more professional"**
- Adjust language style
- Remove casual phrases
- Add formal alternatives

**"Simplify this for a general audience"**
- Remove jargon
- Add explanations
- Use simpler words

---

## Structural Changes

### Formatting

**"Convert bullet points to numbered lists"**
**"Add more headings for better structure"**
**"Create a table of contents"**
**"Format this data as a table"**

---

## Content Analysis

### Summarization

**"Summarize the key points from report.md"**
**"Create an executive summary"**
**"Generate talking points from this presentation"**

### Review

**"Check for spelling and grammar errors"**
**"Find inconsistencies in terminology"**
**"Suggest improvements to section 3"**

---

## Batch Operations

### Multiple Documents

**"Convert all Word docs in the docs folder to markdown"**
**"Export all markdown files back to Word"**
**"Apply consistent formatting to all documents"**

---

## Example Automation Workflows

### Workflow 1: Quick Polish

```
You: "Polish the quarterly-report and export to Word"

Claude will:
1. Read docs/quarterly-report.md
2. Improve writing quality
3. Fix formatting issues
4. Export to quarterly-report.docx
```

### Workflow 2: Meeting Prep

```
You: "Create talking points from the board-presentation"

Claude will:
1. Read docs/board-presentation.md
2. Extract key points
3. Create concise bullet points
4. Save as board-presentation-notes.md
```

### Workflow 3: Version Comparison

```
You: "What changed between the old and new versions?"

Claude will:
1. Read both files
2. Highlight differences
3. Summarize changes
```

---

## Specific Commands

### Reading Files

```
"Read the contents of report.md"
"Show me the first section of presentation.md"
"What's in the docs folder?"
```

### Editing Files

```
"Update the introduction section"
"Add a conclusion to the report"
"Rewrite the bullet points to be more concise"
```

### Conversion

```
"Run the sync script for report.docx"
"Convert proposal.docx to markdown"
"Export all markdown files to Word"
```

---

## 🧠 Point Automation at Your Preferred LLM

Before asking for AI help, run `./scripts/configure-llm.sh` to detect local runtimes (Ollama, LM Studio, llama.cpp, or custom endpoints). The tool saves your choice to `config/llm-selection.json`; plug those values into your MCP configuration so every request uses the model you want.

---

## Best Practices

### 1. Be Specific
❌ "Fix this"
✅ "Fix spelling errors and improve clarity in section 2"

### 2. One Step at a Time
❌ "Convert, edit, format, and export everything"
✅ "Convert report.docx to markdown" → [then] → "Improve the writing"

### 3. Review Changes
Always review my edits before exporting to Word!

### 4. Use Watch Mode
Start watch mode, then ask me to edit. Every change auto-exports!

---

## Advanced Automation

### Custom Workflows

**"Create a workflow for weekly reports"**
I can help you set up:
1. Template creation
2. Auto-formatting
3. Consistent styling
4. Quick export

### Integration with Other Tools

**"Extract data from this spreadsheet and add to the report"**
**"Create a presentation from these meeting notes"**
**"Generate a PDF version"**

---

## Common Tasks

| Task | What to Say |
|------|-------------|
| Convert to Markdown | "Convert [filename] to markdown" |
| Improve writing | "Polish the writing in [filename]" |
| Fix formatting | "Fix the formatting in [filename]" |
| Create summary | "Summarize [filename]" |
| Export to Word | "Export [filename] to Word" |
| Batch convert | "Convert all docs to markdown" |

---

## Tips for Working with Claude

### Give Context
"This is a technical report for engineers" helps me maintain the right tone.

### Ask for Options
"Give me 3 ways to improve this introduction" lets you choose the best approach.

### Iterate
"Make it more concise" → [review] → "Even shorter" gets you exactly what you want.

### Use Examples
"Write it like this: [example]" shows me your preferred style.

---

## Safety Features

✅ I always show you changes before applying them
✅ Original files are preserved
✅ You control what gets exported
✅ Easy to undo (Git + version control)

---

## Getting Started

1. **Place your document** in `docs/` folder
2. **Ask me** to help with a specific task
3. **Review** the changes I make
4. **Export** when you're happy

---

## Example Conversation

```
You: "I have a report.docx that needs polishing"

Me: "I'll convert it to markdown first, then improve it."
    [converts to markdown]
    "Now I'll enhance the writing..."
    [improves content]
    "Would you like me to export it back to Word?"

You: "Yes, please"

Me: [exports to Word]
    "Done! Check docs/report.docx"
```

---

## Need Help?

Just ask me:
- "What can you help me with?"
- "Show me an example workflow"
- "How do I automate [task]?"

I'm here to make your document workflow effortless! 🚀
