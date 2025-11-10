import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const HISTORY_FILE = path.join(PROJECT_ROOT, 'logs', 'history.log')

export interface HistoryEntry {
  timestamp: string
  mode: string
  source: string
  target: string
  status: string
  duration: number
  warnings: string
  note: string
}

function parseHistoryLine(line: string): HistoryEntry | null {
  const parts = line.split('|')
  if (parts.length < 9) return null
  const [timestamp, mode, source, target, status, duration, warnings, , note] = parts
  return {
    timestamp,
    mode,
    source,
    target,
    status,
    duration: Number.parseInt(duration, 10) || 0,
    warnings,
    note,
  }
}

function readHistory(limit = 10): HistoryEntry[] {
  if (!fs.existsSync(HISTORY_FILE)) return []
  const lines = fs.readFileSync(HISTORY_FILE, 'utf8').trim().split('\n')
  const sliced = lines.slice(-limit)
  const entries: HistoryEntry[] = []
  for (const line of sliced) {
    const entry = parseHistoryLine(line)
    if (entry) entries.unshift(entry)
  }
  return entries
}

export function registerHistoryHandlers() {
  ipcMain.handle('history:list', (_event, limit = 10) => readHistory(limit))
}
