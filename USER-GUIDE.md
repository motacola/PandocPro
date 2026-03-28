# PandocPro User Guide

**Version**: 3.8.3  
**Last Updated**: March 27, 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [First Launch](#first-launch)
4. [Core Features](#core-features)
5. [Conversion Workflows](#conversion-workflows)
6. [AI Integration](#ai-integration)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [FAQ](#faq)

---

## Getting Started

### What is PandocPro?

PandocPro is a powerful, cross-platform document conversion application that uses [Pandoc](https://pandoc.org/) to convert between various document formats including:

- **Word**: .docx, .doc
- **Markdown**: .md, .markdown
- **PowerPoint**: .pptx
- **PDF**: .pdf
- **Text**: .txt
- **HTML**: .html
- **And many more formats...**

### System Requirements

- **macOS**: 10.15+ (Catalina)
- **Windows**: 10 or 11
- **Linux**: Ubuntu 20.04+, Fedora 34+, or Arch Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB free space

---

## Installation

### macOS

1. **Download the DMG file** from the GitHub Releases page
2. **Open the DMG file**
3. **Drag PandocPro to your Applications folder**
4. **Double-click to launch**
5. **Allow in System Preferences** if prompted (first launch)

### Windows

1. **Download the installer** (.exe) from GitHub Releases
2. **Run the installer** and follow the wizard
3. **Choose installation location** (default: C:\Program Files\PandocPro)
4. **Launch from Start Menu or Desktop shortcut**

### Linux

1. **Download the AppImage** (universal) or DEB/RPM package
2. **For AppImage**:
   ```bash
   chmod +x PandocPro-*.AppImage
   ./PandocPro-*.AppImage
   ```
3. **For DEB/RPM**:
   ```bash
   sudo dpkg -i PandocPro_*.deb    # Debian/Ubuntu
   # or
   sudo rpm -i PandocPro-*.rpm     # RHEL/Fedora
   ```

### Verify Installation

```bash
# Check if Pandoc is installed
pandoc --version

# Check if PandocPro is installed
# macOS: /Applications/PandocPro.app
# Windows: C:\Program Files\PandocPro\
# Linux: Check ~/Applications or installation directory
```

---

## First Launch

1. **Open PandocPro**
2. **Welcome Screen** appears with:
   - Quick start guide
   - Recent conversions
   - Help resources

3. **Create your first conversion**:
   - Click "New Document"
   - Choose file format
   - Enter content or upload file
   - Click "Convert"

---

## Core Features

### Document Editor

- **Markdown Preview**: Real-time preview as you type
- **Code Syntax Highlighting**: For code blocks
- **Line Numbers**: Toggle on/off
- **Find & Replace**: Ctrl/Cmd+F
- **Undo/Redo**: Full history support

### File Management

- **Open File**: Browse and select files
- **Save File**: Save converted documents
- **Recent Files**: Quick access to recently opened files
- **Drag & Drop**: Drag files directly into the app

### Conversion Actions

- **DOCX to MD**: Convert Word documents to Markdown
- **MD to DOCX**: Convert Markdown to Word documents
- **MD to PPTX**: Create presentations from Markdown
- **MD to PDF**: Export to PDF format
- **And more...**

---

## Conversion Workflows

### Basic Conversion

1. **Click "New Conversion"**
2. **Select source file** (or enter content)
3. **Choose target format** from dropdown
4. **Click "Convert"**
5. **Download the result**

### Batch Conversion

1. **Select multiple files** (Ctrl/Cmd+Click)
2. **Choose target format**
3. **Click "Convert All"**
4. **All files convert in sequence**

### Watch Mode (Auto-Convert)

1. **Open "Watch Folder"**
2. **Select folder to monitor**
3. **Configure conversion rules**
4. **Files auto-convert when added**

Example workflow:
```
1. Create folder: ~/Documents/ToConvert
2. Set as watch folder in PandocPro
3. Place .docx files in that folder
4. PandocPro automatically converts them to .md
5. Converted files saved to: ~/Documents/Converted/
```

---

## AI Integration

### Supported AI Providers

PandocPro supports multiple AI providers for intelligent document analysis and enhancement:

#### 1. **Ollama** (Local)
- **Setup**: Install Ollama from [ollama.com](https://ollama.com)
- **Models**: llama2, mistral, codellama
- **Pros**: Privacy, offline, free
- **Cons**: Requires local GPU/CPU

#### 2. **Minimax** (Cloud)
- **Setup**: Create API key from Minimax
- **Pros**: Fast, reliable
- **Cons**: Requires internet, paid

#### 3. **Custom Models**
- **Setup**: Configure in Settings → AI
- **Supported**: Any provider with API
- **Pros**: Full flexibility
- **Cons**: Requires technical knowledge

### AI Features

#### Document Analysis
- **Extract Structure**: AI analyzes document hierarchy
- **Summarize Content**: Generate summaries
- **Identify Issues**: Detect formatting problems

#### Content Enhancement
- **Improve Writing**: AI suggestions for clarity
- **Style Transfer**: Change tone and style
- **Language Detection**: Auto-detect document language

#### Smart Conversions
- **Context-Aware**: AI understands document context
- **Format Optimization**: Best format for your needs
- **Metadata Extraction**: Pull out key information

### Configuring AI Provider

1. **Open Settings** (Gear icon)
2. **Navigate to "AI Integration"**
3. **Select provider** from dropdown
4. **Enter API key** (if required)
5. **Choose model** for your use case
6. **Save and test**

Example configuration:
```yaml
ai_provider:
  name: "ollama"
  model: "llama2:7b"
  timeout: 30000  # 30 seconds
  temperature: 0.7
  max_tokens: 2048
```

---

## Advanced Features

### Templates

Create reusable document templates:

1. **Go to Templates** menu
2. **Click "New Template"**
3. **Enter template name and content**
4. **Save for later use**

Example template (Meeting Notes):
```markdown
# Meeting Notes: {title}

**Date**: {date}
**Attendees**: {attendees}

## Agenda

[ ] Item 1
[ ] Item 2
[ ] Item 3

## Notes

[Content here]

## Action Items

- [ ] Task 1 - Owner: {owner}
- [ ] Task 2 - Owner: {owner}
```

### Version History

PandocPro tracks conversion history:

- **View History**: See all conversions
- **Restore Previous**: Revert to earlier version
- **Compare Versions**: See differences
- **Export History**: Save conversion log

### Custom Styles

Apply custom styling to conversions:

1. **Settings** → **Styles**
2. **Create new style**
3. **Configure**:
   - Font family
   - Headings style
   - Code block theme
   - Table formatting
4. **Apply to conversions**

### Shortcuts & Automation

Create keyboard shortcuts for frequent actions:

- **Ctrl/Cmd+K**: Quick search
- **Ctrl/Cmd+S**: Save
- **Ctrl/Cmd+P**: Print
- **Ctrl/Cmd+Z**: Undo
- **Ctrl/Cmd+Y**: Redo

---

## Troubleshooting

### Common Issues

#### Conversion Fails

**Problem**: "Conversion failed with error code X"

**Solution**:
1. Check if Pandoc is installed: `pandoc --version`
2. Verify file isn't corrupted
3. Try converting a smaller file first
4. Check error logs in Settings → Debug

#### AI Not Working

**Problem**: "AI provider not responding"

**Solution**:
1. Check internet connection (for cloud providers)
2. Verify API key is correct
3. Check Ollama service is running (for local)
4. Reduce timeout in settings
5. Try different model

#### Large Files Slow

**Problem**: "Conversion taking too long"

**Solution**:
1. Split document into smaller parts
2. Increase RAM allocation in settings
3. Use SSD storage
4. Close other applications
5. Consider upgrading hardware

#### Security Warnings

**Problem**: "App blocked by security"

**Solution**:
1. **macOS**: System Preferences → Security & Privacy → Allow
2. **Windows**: Windows Security → App & Browser Control → Allow
3. **Linux**: Check firewall settings
4. Re-download if file is corrupted

### Debug Mode

Enable detailed logging:

1. **Settings** → **Debug**
2. **Enable verbose logging**
3. **Convert problematic file**
4. **View logs** in Settings → Logs
5. **Share logs** for support

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+N` | New document |
| `Ctrl/Cmd+O` | Open file |
| `Ctrl/Cmd+S` | Save |
| `Ctrl/Cmd+P` | Print |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` | Redo |
| `Ctrl/Cmd+F` | Find |
| `Ctrl/Cmd+K` | Quick search |
| `Ctrl/Cmd+T` | New template |
| `Ctrl/Cmd+,` | Settings |
| `Ctrl/Cmd+Q` | Quit app |
| `Ctrl/Cmd+Shift+R` | Reload |

---

## FAQ

### Q: Is PandocPro free?
**A**: PandocPro is open-source and free for personal use. Enterprise features require a license.

### Q: Can I convert any file format?
**A**: PandocPro supports 30+ formats including docx, md, pptx, pdf, txt, html, and more. Check the full format list in the documentation.

### Q: Do I need an AI provider?
**A**: No. AI features are optional. You can use PandocPro without any AI integration.

### Q: Is my data private?
**A**: Yes. All conversions happen locally on your machine. No data is sent to servers (unless you use cloud AI providers).

### Q: Can I customize the GUI?
**A**: Yes. You can customize themes, shortcuts, and styles through the Settings menu.

### Q: How do I update?
**A**: Check for updates in the app menu, or manually download the latest version from GitHub Releases.

### Q: What if I encounter an error?
**A**: 1) Check the error message 2) Review the logs 3) Search our FAQ 4) Open an issue on GitHub

### Q: Can I use it offline?
**A**: Yes. PandocPro works completely offline. AI features require internet only when using cloud providers.

---

## Getting Help

- **Documentation**: See the docs folder
- **Issues**: [GitHub Issues](https://github.com/motacola/docx-md-sync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/motacola/docx-md-sync/discussions)
- **Email**: christopher.belgrave@gmail.com

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Enjoy converting documents with PandocPro!** 🚀
