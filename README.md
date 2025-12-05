# PandocPro 🚀
> **Seamless Word ↔ Markdown Sync with Modern AI Powers**

PandocPro bridges the gap between Microsoft Word and modern Markdown workflows. Edit in VS Code, collaborate in Word, and let PandocPro keep everything in perfect sync. Now featuring a beautiful, drag-and-drop Dashboard with AI integration.

![Dashboard Preview](gui/public/icon.png)

## ✨ Key Features

### 🚀 Modern Dashboard
- **Drag & Drop**: Drop files anywhere to instantly import and convert.
- **Live Stats**: Track your conversion success rates and activity.
- **Quick Actions**: One-click "Convert All" and "Sync Recent".
- **Visual Status**: Instantly see which files are out of sync (`docx` vs `md`).

### 🤖 AI Auto-Detection
- **Smart Discovery**: Automatically finds local AI models (Ollama, LM Studio, llama.cpp).
- **Privacy First**: Prioritizes local models for secure document processing.
- **Dual Mode**: Connects to cloud providers (Gemini, OpenAI) when you need extra power.
- **FAQ Assistant**: Chat with the documentation using your local AI.

### 🔄 Intelligent Sync
- **Auto-Detect**: Automatically determines if converting `to-md` or `to-docx` is needed.
- **Smart Watch**: "Live edit" mode updates Word docs instantly as you type in Markdown.
- **Presets**: Pre-configured settings for Academic, Business, or Blog styles.

### 🎨 Beautiful UI
- **Modern Design**: Glassmorphism, dark mode, and smooth animations.
- **React + Typescript**: Built on a robust, type-safe stack.
- **Error Recovery**: Intelligent error boundaries and one-click fix suggestions.

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
