import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const CONFIG_DIR = path.join(process.env.HOME ?? '', '.config', 'pandocpro')
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json')
const FIRST_RUN_FLAG = path.join(CONFIG_DIR, '.first-run-complete')
const DEFAULT_DOCS_DIR = path.join(process.env.HOME ?? '', 'Documents', 'PandocPro')

interface SettingsData {
  docsPath: string
  notificationsEnabled: boolean
}

function readSettings(): SettingsData {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {
      docsPath: DEFAULT_DOCS_DIR,
      notificationsEnabled: true,
    }
  }
}

function ensureDocsDirectory(docsPath: string) {
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true })
  }
}

function isFirstRun(): boolean {
  return !fs.existsSync(FIRST_RUN_FLAG)
}

function markFirstRunComplete() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(FIRST_RUN_FLAG, new Date().toISOString(), 'utf8')
}

function setupFirstRun() {
  const settings = readSettings()
  const docsPath = settings.docsPath
  
  // Create docs directory
  ensureDocsDirectory(docsPath)
  
  // Create sample files
  const welcomePath = path.join(docsPath, 'Welcome.md')
  const samplePath = path.join(docsPath, 'Sample.docx')
  
  if (!fs.existsSync(welcomePath)) {
    const welcomeContent = `# Welcome to PandocPro!

This is a sample Markdown file to help you get started.

## What is PandocPro?

PandocPro is a desktop application that helps you convert between Markdown and Word documents.

## Quick Start

1. **Convert to Word**: Select "To Word" mode and click "Run Conversion"
2. **Convert to Markdown**: Select "To Markdown" mode and click "Run Conversion"
3. **Auto Sync**: Enable "Auto Sync" to automatically convert files when they change

## Features

- 📝 **WYSIWYG Markdown Editor**
- 🔄 **Bidirectional Conversion**
- 🎯 **Auto-Sync Mode**
- 📊 **Conversion History**
- ⚙️ **Customizable Settings**

## Need Help?

Check out the FAQ section for common questions and answers!
`
    fs.writeFileSync(welcomePath, welcomeContent, 'utf8')
  }
  
  // Note: For Sample.docx, we would need to create an actual DOCX file
  // This would require using a library like docx.js or copying a pre-made sample
  // For now, we'll skip this and just create the Markdown file
  
  markFirstRunComplete()
}

function writeSettings(data: SettingsData) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function getPandocVersion() {
  try {
    const result = spawnSync('pandoc', ['-v'], { encoding: 'utf8' })
    if (result.status === 0) {
      const firstLine = result.stdout.split('\n')[0]
      return firstLine
    }
  } catch {
    // ignore
  }
  return null
}

export function registerSettingsHandlers() {
  // Run first-time setup if needed
  if (isFirstRun()) {
    setupFirstRun()
  }
  
  ipcMain.handle('system:info', () => {
    const settings = readSettings()
    return {
      pandocVersion: getPandocVersion(),
      nodeVersion: process.version,
      docsPath: settings.docsPath,
      notificationsEnabled: settings.notificationsEnabled,
    }
  })

  ipcMain.handle('settings:get', () => readSettings())

  ipcMain.handle('settings:updateDocsPath', (_event, docsPath?: string) => {
    const settings = readSettings()
    const nextPath = docsPath ?? settings.docsPath
    if (!fs.existsSync(nextPath) || !fs.statSync(nextPath).isDirectory()) {
      throw new Error('Docs path must be an existing folder')
    }
    const updated: SettingsData = { ...settings, docsPath: nextPath }
    writeSettings(updated)
    return updated
  })

  ipcMain.handle('settings:chooseDocsPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const selected = result.filePaths[0]
    const settings = readSettings()
    const updated: SettingsData = { ...settings, docsPath: selected }
    writeSettings(updated)
    return updated
  })

  ipcMain.handle('settings:update', (_event, payload: Partial<SettingsData>) => {
    const settings = readSettings()
    const merged: SettingsData = {
      ...settings,
      ...payload,
    }
    if (!fs.existsSync(merged.docsPath)) {
      throw new Error('Docs path must exist')
    }
    writeSettings(merged)
    return merged
  })
}
