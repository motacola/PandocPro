# 🚀 PandocPro

**AI-powered long-document editing — private, fast, and built for real workflows.**

PandocPro is a local-first writing and editing tool that lets you convert, improve, and manage large Word and Markdown documents without token limits, formatting issues, or privacy risks.

Work section-by-section. Use local LLMs. Keep everything on your device.
Perfect for writers, agencies, researchers, and anyone producing long or sensitive documents.

---

## 🌟 Why PandocPro?

Most AI tools collapse when you give them a 40-page brief, a client report, or a technical document. PandocPro solves this by creating a clean, predictable, private document workflow around AI.

You’ll download PandocPro because you want:
*   AI assistance without leaking client files
*   Long-document editing without token errors
*   Clean DOCX ↔ Markdown transitions
*   Precise section-based improvements
*   A workflow you can trust, not a hacky workaround
*   A desktop app (with a `.dmg`) you can run instantly

PandocPro is built for people who write professionally — not for casual notes.

---

## 🎯 Core Value in One Sentence

PandocPro makes AI practical for serious documents — privately, locally, and without breaking your formatting.

---

## 🔥 Key Features at a Glance

### 🧭 1. Clean Word ↔ Markdown Workflow

PandocPro handles conversion cleanly using Pandoc behind the scenes.
You get:
*   Perfect structure retention
*   Clean headings + lists
*   Predictable output
*   Easy round-tripping back to `.docx`

No more mangled formatting.

---

### ✂️ 2. Edit Long Documents in Small, Targeted Sections

Instead of passing a 20,000-token document to an LLM, PandocPro lets you work like this:
1.  Choose a section
2.  Give an instruction
3.  PandocPro updates only that part

This means:
*   No token issues
*   No memory problems
*   No unexpected rewrites
*   **70–90% fewer tokens per edit**

A controlled, surgical editing workflow.

---

### 🤖 3. Precision AI Improvements

Use AI for:
*   Tone improvement
*   Grammar + clarity
*   Summaries
*   Rewrites
*   Structural fixes
*   Expansions
*   Professional polish

Each edit affects only the area you select — never the whole file.

---

### 🛡️ 4. Privacy-First Architecture

Your files stay on your device.
Nothing is uploaded unless you explicitly choose to use a cloud model.

Local support includes:
*   Ollama
*   LM Studio
*   Qwen
*   DeepSeek
*   Mistral
*   Llama 3
*   Any model running locally via OpenAI-compatible servers

This makes PandocPro ideal for confidential, legal, academic, and client-sensitive work.

---

### 🖥️ 5. GUI + CLI + MCP

PandocPro adapts to how you work:

**GUI**
A focused dashboard for converting, editing, exporting, and managing documents.

**CLI**
Scriptable for pipelines, automation, and power-users.

**MCP Support**
Connects seamlessly to Claude, ChatGPT, Cursor and any MCP-enabled editor.
Your AI assistant can:
*   List documents
*   Convert DOCX to Markdown
*   Improve sections
*   Export back to Word
*   Sync changes instantly

This turns your LLM into a powerful, controlled editing partner.

---

### 📦 6. macOS Ready-to-Run .dmg Installer

No build steps.
No terminal commands.
No setup hassle.

Download the `.dmg` → Install → Work.

This is the fastest way to get started.

---

## 🧑‍💻 Who PandocPro Is For

PandocPro is perfect for:
*   Agencies producing proposals, decks, and reports
*   Technical writers + documentation teams
*   Researchers + academics
*   Lawyers + compliance writers
*   Consultants + analysts
*   Anyone writing 10–100+ page documents
*   Anyone who needs AI support but cannot expose private files

PandocPro fits into serious professional environments, not hobby projects.

---

## 🧩 Feature Overview

| Category | Features |
| :--- | :--- |
| **Conversion** | DOCX ↔ Markdown, structure-preserving, preset templates |
| **Editing** | Section-based modification, one-click rewrites, tone shifts, summaries |
| **AI** | Local + cloud support, targeted improvements, safe output |
| **Workflow** | Watch mode, smart sync, clean exports, conflict resolution |
| **Interfaces** | GUI, CLI, MCP, automation-friendly |
| **Privacy** | Local-first, no forced uploads, full offline editing |

---

## 🖼️ Screenshots (placeholders you can replace)

Add these below once you capture your UI:

![PandocPro Dashboard](./screenshots/dashboard.png)
![Section Editing](./screenshots/section-editing.png)
![AI Improvements](./screenshots/ai-improve.png)

---

## 📥 Download

### macOS .dmg Installer

👉 Available under “Releases” in this repository.

### Developers

If you want to run PandocPro from source:

```bash
git clone https://github.com/motacola/PandocPro
cd PandocPro
npm install
npm run gui:dev
```

---

## ⚙️ CLI Quick Start

**Convert DOCX → Markdown:**
```bash
dsync convert report.docx
```

**Improve a section:**
```bash
dsync improve report.md --section 3 --prompt "Tighten tone and improve clarity"
```

**Export back to Word:**
```bash
dsync export report.md --output final-report.docx
```

---

## 🔗 MCP Quick Start

Add this block to your Claude or ChatGPT MCP config:

```json
{
  "servers": {
    "pandocpro": {
      "command": "npx",
      "args": ["pandocpro", "mcp"],
      "cwd": "/PATH/TO/PandocPro"
    }
  }
}
```

Then you can ask:

> “Convert report.docx to markdown, improve the introduction, and export to Word.”

---

## 🧭 Example Workflow

1.  Drag a `.docx` into PandocPro
2.  The app converts it to Markdown
3.  Select the intro → “Improve tone + clarity”
4.  Make a few AI-assisted edits
5.  Run Watch Mode while refining sections
6.  Export back to Word for delivery

A clean, repeatable document editing pipeline — with full privacy.

---

## ❤️ Why People Love PandocPro

*   It saves hours per document
*   It makes AI feel reliable
*   It protects private content
*   It eliminates token headaches
*   It keeps formatting pristine
*   It fits into real professional workflows

---

## 📣 Contributing

Pull requests welcome!
If you build templates, presets, or integrations, submit them in `/plugins` or `/presets`.

---

## 📝 License

MIT
