import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const TELEMETRY_FILE = path.join(process.env.HOME ?? '', '.config', 'pandocpro', 'telemetry.json')
const MAX_TELEMETRY_EVENTS = 3000

export type TelemetryEvent =
  | 'conversion_success'
  | 'conversion_error'
  | 'watch_error'
  | 'conversion_duration_ms'
  | 'analysis_duration_ms'
  | 'large_document_processed'

export interface TelemetryEntry {
  timestamp: string
  event: TelemetryEvent
  metadata?: Record<string, unknown>
}

type LegacyTelemetryRecord = {
  date: string
  events: Record<string, number>
}

function isLegacyTelemetryRecord(item: unknown): item is LegacyTelemetryRecord {
  return Boolean(
    item
      && typeof item === 'object'
      && 'date' in item
      && 'events' in item
      && typeof (item as LegacyTelemetryRecord).date === 'string'
      && typeof (item as LegacyTelemetryRecord).events === 'object'
  )
}

function readTelemetry(): TelemetryEntry[] {
  try {
    const raw = fs.readFileSync(TELEMETRY_FILE, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    if (parsed.every((item) => isLegacyTelemetryRecord(item))) {
      const migrated: TelemetryEntry[] = []
      for (const record of parsed as LegacyTelemetryRecord[]) {
        for (const [event, count] of Object.entries(record.events ?? {})) {
          if (typeof count !== 'number' || count <= 0) {
            continue
          }
          for (let i = 0; i < count; i += 1) {
            if (event === 'conversion_success' || event === 'conversion_error' || event === 'watch_error') {
              migrated.push({
                timestamp: `${record.date}T00:00:00.000Z`,
                event,
              })
            }
          }
        }
      }
      return migrated
    }

    return parsed
      .filter((item): item is TelemetryEntry => {
        if (!item || typeof item !== 'object') return false
        const candidate = item as TelemetryEntry
        return typeof candidate.timestamp === 'string' && typeof candidate.event === 'string'
      })
      .slice(-MAX_TELEMETRY_EVENTS)
  } catch {
    return []
  }
}

function writeTelemetry(records: TelemetryEntry[]) {
  const dir = path.dirname(TELEMETRY_FILE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(records.slice(-MAX_TELEMETRY_EVENTS), null, 2), 'utf8')
}

function appendTelemetry(event: TelemetryEvent, metadata?: Record<string, unknown>) {
  const records = readTelemetry()
  records.push({
    timestamp: new Date().toISOString(),
    event,
    metadata,
  })
  writeTelemetry(records)
}

export function registerTelemetryHandlers() {
  ipcMain.handle('telemetry:stats', () => readTelemetry())
  ipcMain.on('telemetry:increment', (_event, event: TelemetryEvent) => appendTelemetry(event))
}

export function telemetryIncrement(event: TelemetryEvent) {
  appendTelemetry(event)
}

export function telemetryRecord(event: TelemetryEvent, metadata: Record<string, unknown>) {
  appendTelemetry(event, metadata)
}
