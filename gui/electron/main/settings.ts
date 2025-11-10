import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const CONFIG_DIR = path.join(process.env.HOME ?? '', '.config', 'pandocpro')
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json')
const DEFAULT_DOCS_DIR = path.join(path.resolve(process.env.APP_ROOT ?? '.', '..'), 'docs')

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
