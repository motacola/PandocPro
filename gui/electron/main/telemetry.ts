import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const TELEMETRY_FILE = path.join(process.env.HOME ?? '', '.config', 'pandocpro', 'telemetry.json')

type TelemetryEvent = 'conversion_success' | 'conversion_error' | 'watch_error'

interface TelemetryRecord {
  date: string
  events: Record<TelemetryEvent, number>
}

function readTelemetry(): TelemetryRecord[] {
  try {
    const raw = fs.readFileSync(TELEMETRY_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeTelemetry(records: TelemetryRecord[]) {
  const dir = path.dirname(TELEMETRY_FILE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(records, null, 2), 'utf8')
}

function increment(event: TelemetryEvent) {
  const today = new Date().toISOString().slice(0, 10)
  const records = readTelemetry()
  const existing = records.find((r) => r.date === today)
  if (existing) {
    existing.events[event] = (existing.events[event] || 0) + 1
  } else {
    records.push({ date: today, events: { conversion_success: 0, conversion_error: 0, watch_error: 0, [event]: 1 } })
  }
  writeTelemetry(records)
}

export function registerTelemetryHandlers() {
  ipcMain.handle('telemetry:stats', () => readTelemetry())
  ipcMain.on('telemetry:increment', (_event, event: TelemetryEvent) => increment(event))
}

export function telemetryIncrement(event: TelemetryEvent) {
  increment(event)
}
