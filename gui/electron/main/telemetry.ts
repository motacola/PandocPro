import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const TELEMETRY_FILE = path.join(process.env.HOME ?? '', '.config', 'pandocpro', 'telemetry.json')
const MAX_TELEMETRY_EVENTS = 3000
const DEFAULT_RETENTION_DAYS = 30

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

const TELEMETRY_EVENTS: Set<TelemetryEvent> = new Set([
  'conversion_success',
  'conversion_error',
  'watch_error',
  'conversion_duration_ms',
  'analysis_duration_ms',
  'large_document_processed',
])

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

function parseRetentionDays() {
  const raw = process.env.PANDOCPRO_TELEMETRY_RETENTION_DAYS
  if (!raw) {
    return DEFAULT_RETENTION_DAYS
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RETENTION_DAYS
  }
  return Math.round(parsed)
}

function isTelemetryEvent(event: unknown): event is TelemetryEvent {
  return typeof event === 'string' && TELEMETRY_EVENTS.has(event as TelemetryEvent)
}

function normalizeEntry(candidate: unknown): TelemetryEntry | null {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }
  const entry = candidate as TelemetryEntry
  if (typeof entry.timestamp !== 'string' || !isTelemetryEvent(entry.event)) {
    return null
  }
  const timestampMs = Date.parse(entry.timestamp)
  if (!Number.isFinite(timestampMs)) {
    return null
  }
  if (entry.metadata && typeof entry.metadata !== 'object') {
    return {
      timestamp: entry.timestamp,
      event: entry.event,
    }
  }
  return entry
}

function pruneTelemetry(records: TelemetryEntry[]) {
  const retentionDays = parseRetentionDays()
  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
  return records
    .filter((entry) => Date.parse(entry.timestamp) >= cutoff)
    .slice(-MAX_TELEMETRY_EVENTS)
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
      return pruneTelemetry(migrated)
    }

    const normalized = parsed
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is TelemetryEntry => entry !== null)

    return pruneTelemetry(normalized)
  } catch {
    return []
  }
}

function writeTelemetry(records: TelemetryEntry[]) {
  const dir = path.dirname(TELEMETRY_FILE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(pruneTelemetry(records), null, 2), 'utf8')
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
  ipcMain.handle('telemetry:stats', () => {
    const records = readTelemetry()
    writeTelemetry(records)
    return records
  })
  ipcMain.on('telemetry:increment', (_event, event: TelemetryEvent) => appendTelemetry(event))
}

export function telemetryIncrement(event: TelemetryEvent) {
  appendTelemetry(event)
}

export function telemetryRecord(event: TelemetryEvent, metadata: Record<string, unknown>) {
  appendTelemetry(event, metadata)
}
