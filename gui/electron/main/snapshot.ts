import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { ipcMain } from 'electron'

const HISTORY_DIR = path.join(os.homedir(), '.config', 'pandocpro', 'history')

// Ensure history dir exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true })
}

export interface SnapshotEntry {
  originalPath: string
  snapshotPath: string
  timestamp: number
  size: number
}

function getSafeDirName(filePath: string): string {
  // Create a stable, safe directory name for a given file path
  // We use a hash to keep it short and unique, but append basename for readability
  const hash = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 8)
  const basename = path.basename(filePath).replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${basename}_${hash}`
}

export async function createSnapshot(filePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) return null

    const safeDir = getSafeDirName(filePath)
    const targetDir = path.join(HISTORY_DIR, safeDir)
    
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true })
    }

    const stat = await fs.promises.stat(filePath)
    const timestamp = Date.now()
    const ext = path.extname(filePath)
    const snapshotName = `${timestamp}${ext}` // e.g., 1700000000.md
    const snapshotPath = path.join(targetDir, snapshotName)

    await fs.promises.copyFile(filePath, snapshotPath)
    
    // Clean up old snapshots? (Keep last 20?)
    cleanupSnapshots(targetDir, 20)

    return snapshotPath
  } catch (err) {
    console.error('Snapshot failed:', err)
    return null
  }
}

async function cleanupSnapshots(dir: string, keep: number) {
    try {
        const files = await fs.promises.readdir(dir)
        if (files.length <= keep) return

        // Sort by name (timestamp) descending
        files.sort((a, b) => b.localeCompare(a))

        // delete older files
        const toDelete = files.slice(keep)
        for (const file of toDelete) {
            await fs.promises.unlink(path.join(dir, file)).catch(() => {})
        }
    } catch {
        // ignore cleanup errors
    }
}

export async function listSnapshots(filePath: string): Promise<SnapshotEntry[]> {
  try {
    const safeDir = getSafeDirName(filePath)
    const targetDir = path.join(HISTORY_DIR, safeDir)
    
    if (!fs.existsSync(targetDir)) return []

    const files = await fs.promises.readdir(targetDir)
    const entries: SnapshotEntry[] = []

    for (const file of files) {
        const fullPath = path.join(targetDir, file)
        const stat = await fs.promises.stat(fullPath)
        // file name is timestamp + ext
        const tsString = path.basename(file, path.extname(file))
        const timestamp = parseInt(tsString)
        
        if (!isNaN(timestamp)) {
             entries.push({
                originalPath: filePath,
                snapshotPath: fullPath,
                timestamp,
                size: stat.size
             })
        }
    }
    
    // Sort newest first
    return entries.sort((a, b) => b.timestamp - a.timestamp)

  } catch (err) {
    console.error('List snapshots failed:', err)
    return []
  }
}

export async function restoreSnapshot(snapshotPath: string, targetPath: string): Promise<boolean> {
    try {
        if (!fs.existsSync(snapshotPath)) throw new Error('Snapshot not found')
        
        // Backup current before restoring? (Safety net)
        // Yes, let's do a quick safety snapshot of current state before overwriting
        await createSnapshot(targetPath)

        await fs.promises.copyFile(snapshotPath, targetPath)
        return true
    } catch (err) {
        console.error('Restore failed:', err)
        throw err
    }
}

export function registerSnapshotHandlers() {
    ipcMain.handle('snapshot:list', (_, filePath: string) => listSnapshots(filePath))
    ipcMain.handle('snapshot:restore', (_, { snapshotPath, targetPath }) => restoreSnapshot(snapshotPath, targetPath))
    ipcMain.handle('snapshot:create', (_, filePath: string) => createSnapshot(filePath))
}
