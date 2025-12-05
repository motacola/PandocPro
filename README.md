# PandocPro: Edit Documents with AI Without Fighting Token Limits 🚀

> **Work on 100-page documents with Claude or ChatGPT as easily as 1-page documents.**
> Section-based editing + Markdown/Word sync + 70-90% token savings.

PandocPro bridges the gap between Microsoft Word and modern AI workflows. It enables a powerful "chunked" editing workflow where AI agents can read and improve specific sections of your document without being overwhelmed by context limits or token costs.

![Dashboard Preview](gui/public/icon.png)

## 🔥 The Game-Changer for AI Workflows

AI assistants like Claude are amazing—until you try to edit a long document. Then you hit context limits, get incomplete responses, and waste tokens regenerating the same content.

**PandocPro solves the matching problem:**

1.  **Format Conflict** → Markdown ↔ Word sync solves collaboration
2.  **LLM Limitations** → Section-based editing solves context/token issues
3.  **Token Costs** → **70-90% reduction** via surgical edits

### The "Surgical Edit" Workflow

| Traditional AI Workflow | PandocPro Workflow |
| :--- | :--- |
| **User:** "Rewrite this 50-page doc" | **User:** "Improve section 3" |
| **AI:** Reads 50 pages (15k tokens) | **AI:** Reads 1 section (2k tokens) |
| **Result:** Incomplete output, broken format | **Result:** Perfect edit, format preserved |
| **Cost:** ~$4.00 | **Cost:** ~$0.10 |

### 📊 Real-World Use Cases

-   **Academic Papers**: *"Claude, write the literature review introduction."* (AI updates just that section; the rest of the Word doc stays intact).
-   **Technical Docs**: *"Claude, update the authentication section with new OAuth details."* (Maintenance becomes possible for 200+ page wikis).
-   **Business Reports**: *"Claude, make the executive summary more impactful."* (Consistent quality across 50 pages without context loss).

---

## ✨ Key Features

### 🚀 Modern Dashboard
-   **Drag & Drop**: Drop files anywhere to instantly import and convert.
-   **Live Stats**: Track your conversion success rates and activity.
-   **Quick Actions**: One-click "Convert All" and "Sync Recent".
-   **Visual Status**: Instantly see which files are out of sync (`docx` vs `md`).

### 🤖 AI Auto-Detection
-   **Smart Discovery**: Automatically finds local AI models (Ollama, LM Studio, llama.cpp).
-   **Privacy First**: Prioritizes local models for secure document processing.
-   **Dual Mode**: Connects to cloud providers (Gemini, OpenAI) when you need extra power.
-   **FAQ Assistant**: Chat with the documentation using your local AI.

### 🔄 Intelligent Sync
-   **Auto-Detect**: Automatically determines if converting `to-md` or `to-docx` is needed.
-   **Smart Watch**: "Live edit" mode updates Word docs instantly as you type in Markdown.
-   **Presets**: Pre-configured settings for Academic, Business, or Blog styles.

---

## ⚡ Quick Start

### Option 1: The Modern GUI (Recommended)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Mode**
   ```bash
   npm run gui:dev
   ```

3. **Build for Production** (creates `.dmg` / `.zip`)
   ```bash
   npm run gui:build
   ```

### Option 2: CLI Power Tools

For terminal lovers, the classic `dsync` workflow is still fully supported.

1. **Setup Alias**
   ```bash
   ./scripts/setup.sh
   ```

2. **Run Interactive Menu**
   ```bash
   dsync
   ```

---

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Framer Motion, Tailwind CSS
- **Backend**: Electron, IPC, Node.js
- **Editor**: TipTap (Rich Markdown editing)
- **Core**: Pandoc (Universal document converter)

---

## 📂 Project Structure

```
PandocPro/
├── gui/                # Modern Electron App
│   ├── src/            # React Frontend
│   └── electron/       # Main Process
├── docs/               # Document Workspace
├── scripts/            # CLI Tools & Helpers
└── README.old.md       # Legacy Documentation
```

---

**Made with ❤️ for efficient document workflows.**
