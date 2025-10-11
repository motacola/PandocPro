 `dsync`
- **Everything is automatic** - just select from menu
- **Can't break anything** - originals are safe
- **Multiple ways to access** - pick what works for you
- **Help always available** - docs + Claude

---

## 3-Step Quick Start

```
1. Type: dsync
2. Pick a document
3. Choose what to do
```

**Done! You're a pro!** 🎉

---

## Advanced (When Ready)

```bash
# Direct conversion
./scripts/docx-sync.sh docs/file.docx docs/file.md to-md

# Watch specific file
MD_FILE="docs/file.md" DOCX_FILE="docs/file.docx" npm run watch

# Batch convert
for f in docs/*.docx; do 
  ./scripts/docx-sync.sh "$f" "${f%.docx}.md" to-md
done
```

---

## Emoji Legend

| Emoji | Meaning |
|-------|---------|
| 📄 | Markdown file |
| 📘 | Word document |
| 🔄 | Converting/syncing |
| 👀 | Watching for changes |
| ✏️ | Editing |
| ✅ | Success |
| ❌ | Error |
| 💡 | Tip |
| 🎯 | Important |
| ⚡ | Fast/efficient |

---

**Keep this handy - you'll be an expert in no time!** 🚀

*Made with ❤️ for efficient workflows*
