import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs')

function assertWithinDocs(filePath: string) {
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(DOCS_DIR)) {
    throw new Error('Access denied: file must live inside docs/')
  }
  return resolved
}

export function registerFileHandlers() {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const resolved = assertWithinDocs(filePath)
    const contents = await fs.readFile(resolved, 'utf8')
    return contents
  })

  ipcMain.handle('file:write', async (_event, filePath: string, contents: string) => {
    const resolved = assertWithinDocs(filePath)
    await fs.writeFile(resolved, contents, 'utf8')
    return true
  })
}
