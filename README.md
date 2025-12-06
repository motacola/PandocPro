# 🚀 PandocPro
### *AI-powered long-document editing — private, fast, and built for real workflows.*

PandocPro is a local-first writing and editing tool that lets you convert, improve, and manage large Word and Markdown documents **without token limits, formatting issues, or privacy risks**.

Work section-by-section. Use local LLMs. Keep everything on your device.  
Perfect for writers, agencies, researchers, and anyone producing long or sensitive documents.

---

## 🌟 Why PandocPro?
Most AI tools collapse when you give them a 40-page brief, a client report, or a technical document. PandocPro solves this by creating a **clean, predictable, private document workflow** around AI.

You’ll download PandocPro because you want:

- **AI assistance without exposing private files**
- **Long-document editing without token or context limits**
- **Clean DOCX ↔ Markdown transitions**
- **Precise section-based editing and improvements**
- **A workflow you can trust, not a hacky workaround**
- **A desktop app (with a `.dmg`) you can install and run instantly**

PandocPro is built for people who write or edit professionally — not for quick notes.

---

## 🎯 Core Value in One Sentence
**PandocPro makes AI practical for serious documents — privately, locally, and without breaking your formatting.**

---

## 🔥 Key Features at a Glance

### 🧭 Clean Word ↔ Markdown Workflow
PandocPro uses Pandoc under the hood for conversions.  
Expect:  
- Full structure retention  
- Proper headings & lists  
- Reliable round-trip exports  
- Zero formatting surprises  

### ✂️ Section-based Editing for Long Documents
Instead of feeding a 20,000-token document to an AI:  

- Select a section  
- Ask for improvements  
- Update just that part  

That means:  
- No token issues  
- No broken formatting  
- 70–90% fewer tokens per edit  
- Higher control, lower risk  

### 🤖 Targeted AI Improvements  
Use AI for:  
- Tone adjustments  
- Grammar, clarity, style polishing  
- Summaries or rewrites  
- Structural edits or expansions  

Each AI call affects only what you select. The rest of the document stays intact.

### 🛡️ Privacy-first: Local or Cloud LLMs, Your Choice  
Work entirely offline using local LLMs (Ollama, LM Studio, Qwen, etc.).  
Cloud usage remains optional — only when you choose.  

Ideal for:  
> - Client deliverables under NDA  
> - Legal, financial, academic, or sensitive documents  
> - Internal reports or company-only content  

### 🖥️ GUI + CLI + MCP — Work How You Want  
#### GUI  
- Intuitive dashboard  
- Drag & drop import/export  
- Live status of DOCX ⇆ MD sync  
- Presets (Academic, Business, Blog)

#### CLI (for power users)  
- `dsync` tools for automation  
- Scriptable workflows  

#### MCP Support  
Integrate with MCP-enabled tools (ChatGPT, Claude, etc.) — trigger conversions, edits or exports directly from your AI assistant.  

### 📦 Ready-to-Use Installer for macOS  
We provide a `.dmg` installer — no build steps, no dependency pain.  
Download → install → start working.

---

## 🧑‍💻 Who PandocPro Is For

- Agencies producing proposals, decks, client reports  
- Technical writing and documentation teams  
- Researchers and academics  
- Legal, financial, and consultancy professionals  
- Anyone writing or editing 10–100+ page documents  
- Anyone wanting AI editing **without risking privacy**  

---

## 🧩 Feature Overview

| Category   | Features |
|------------|----------|
| Conversion | DOCX ↔ Markdown via Pandoc, template support, clean exports |
| Editing    | Section-based edits, targeted improvements, tone/style changes, summaries |
| AI         | Local & optional cloud LLM support, precise control, safe editing |
| Workflow   | Watch mode, smart sync, conflict handling, export management |
| Interfaces | GUI, CLI, MCP — flexible for any user style |
| Privacy    | Local-first, optional cloud, no forced uploads |
| Distribution | Ready-to-use macOS `.dmg`, scriptable CLI install/build |

---

## 🖼️ Visual Preview

![PandocPro Dashboard](screenshots/dashboard.png)
![Section Editing](screenshots/section-editing.png)
![AI Actions](screenshots/ai-improve.png)

---

## 📥 Download / Install

### ✅ macOS (recommended)  
Download the latest `.dmg` installer from the Releases tab — install and run in seconds.

### 💻 From Source (all platforms)

```bash
git clone https://github.com/motacola/PandocPro.git  
cd PandocPro  
npm install  
npm run gui:dev   # for development  
# or  
npm run gui:build  # creates production build (dmg / zip)
```

---

## ⚙️ CLI Quick Start

**Convert DOCX → Markdown:**

```bash
dsync convert document.docx
```

**Improve a section:**

```bash
dsync improve document.md --section 3 --prompt "Tighten tone and improve clarity"
```

**Export back to DOCX:**

```bash
dsync export document.md --output final-version.docx
```

---

## 🔗 MCP Quick Start (for LLM-integrated workflows)

Add this to your MCP config:

```json
{
  "servers": {
    "pandocpro": {
      "command": "npx",
      "args": ["pandocpro", "mcp"],
      "cwd": "/path/to/PandocPro"
    }
  }
}
```

Then you can ask your LLM:

“Convert report.docx to markdown, improve the introduction, and export to Word.”

---

## ❤️ Why Users Love PandocPro
- Saves time on long-form editing
- Makes AI editing reliable and controlled
- Keeps documents private and local
- Eliminates formatting issues
- Enables professional workflows for serious documents
- Combines editing, AI, and export in one tool

---

## 📣 Contributing & Feedback

Pull requests and contributions welcome!
Create templates, presets, or automation scripts — drop them into `/templates` or `/scripts`, and submit a PR.

---

## 📄 License

MIT
