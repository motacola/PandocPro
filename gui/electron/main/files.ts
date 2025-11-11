import { ipcMain } from 'electron'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const SETTINGS_FILE = path.join(process.env.HOME ?? '', '.config', 'pandocpro', 'settings.json')
const DEFAULT_DOCS_DIR = path.join(PROJECT_ROOT, 'docs')

function getDocsDir() {
  try {
    const contents = fs.readFileSync(SETTINGS_FILE, 'utf8')
    const parsed = JSON.parse(contents)
    if (parsed.docsPath && fs.existsSync(parsed.docsPath)) {
      return parsed.docsPath
    }
  } catch {
    // ignore missing config
  }
  return DEFAULT_DOCS_DIR
}

function assertWithinDocs(filePath: string) {
  const resolved = path.resolve(filePath)
  const docsDir = getDocsDir()
  const normalizedDocsDir = path.resolve(docsDir)
  if (!resolved.startsWith(normalizedDocsDir + path.sep) && resolved !== normalizedDocsDir) {
    throw new Error('Access denied: file must live inside docs/')
  }
  return resolved
}

export function registerFileHandlers() {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const resolved = assertWithinDocs(filePath)
    const contents = await fsPromises.readFile(resolved, 'utf8')
    return contents
  })

  ipcMain.handle('file:write', async (_event, filePath: string, contents: string) => {
    const resolved = assertWithinDocs(filePath)
    await fsPromises.writeFile(resolved, contents, 'utf8')
    return true
  })
}
