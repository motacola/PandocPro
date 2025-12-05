export type ConversionMode = 'to-md' | 'to-docx' | 'to-pptx' | 'auto'



export interface ConversionPreset {
  id: string
  name: string
  description: string
  mode: ConversionMode
  options?: {
    textOnly?: boolean
    includeMetadata?: boolean
    [key: string]: any
  }
}

export interface ConversionStartPayload {
  docxPath: string
  mdPath: string
  mode: ConversionMode
  requestId: string
  textOnly?: boolean
}

export interface ConversionChunkPayload {
  requestId: string
  chunk: string
}

export interface ConversionExitPayload {
  requestId: string
  code: number
}

export interface ConversionErrorPayload {
  requestId: string
  message: string
}

export type LogEntry =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'status'; text: string }
  | { type: 'notify'; text: string }

export interface LogRun {
  requestId: string
  messages: LogEntry[]
}

export interface DocsListEntry {
  docx: string
  md: string
  mdExists: boolean
  docxMtime: number
  mdMtime: number | null
  docxSize: number
  mdSize: number | null
}

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

export interface WatchStatus {
  docxPath: string
  mdPath: string
  running: boolean
  lastSync: string | null
  mode: 'paused' | 'running'
  message?: string
}

export interface SystemInfo {
  pandocVersion: string | null
  nodeVersion: string
  docsPath: string
  notificationsEnabled: boolean
}

export interface SettingsData {
  docsPath: string
  notificationsEnabled: boolean
  presets?: ConversionPreset[]
  lastUsedModes?: Record<string, ConversionMode>
  referenceDoc?: string
}

export interface LlmStatus {
  configured: boolean
  provider?: string
  displayName?: string
  model?: string
}

export interface DetectedProvider {
  id: string
  name: string
  available: boolean
  endpoint?: string
  model?: string
  requiresApiKey: boolean
  priority: number
}

export interface TelemetryEntry {
  timestamp: string
  event: string
  metadata?: Record<string, unknown>
}

export interface SnapshotEntry {
  originalPath: string
  snapshotPath: string
  timestamp: number
  size: number
}

export interface Persona {
  id: string
  name: string
  instruction: string
  icon?: string
}

declare global {
  interface Window {
    pandocPro: {
      startConversion(payload: ConversionStartPayload): void
      cancelConversion(requestId: string): void
      onStdout(listener: (data: ConversionChunkPayload) => void): () => void
      onStderr(listener: (data: ConversionChunkPayload) => void): () => void
      onExit(listener: (data: ConversionExitPayload) => void): () => void
      onError(listener: (data: ConversionErrorPayload) => void): () => void
      listDocuments(): Promise<DocsListEntry[]>
      listHistory(limit?: number): Promise<HistoryEntry[]>
      readFile(filePath: string): Promise<string>
      writeFile(filePath: string, contents: string): Promise<boolean>
      startWatch(payload: { docxPath: string; mdPath: string }): Promise<void>
      stopWatch(): Promise<void>
      onWatchUpdate(listener: (data: WatchStatus) => void): () => void
      getSystemInfo(): Promise<SystemInfo>
      getSettings(): Promise<SettingsData>
      updateDocsPath(path: string): Promise<SettingsData>
      chooseDocsPath(): Promise<SettingsData | null>
      chooseReferenceDoc(): Promise<SettingsData | null>
      updateSettings(payload: Partial<SettingsData>): Promise<SettingsData>
      getFaq(): Promise<string>
      getFaqEntries(): Promise<string>
      getLlmStatus(): Promise<LlmStatus>
      askFaqAi(payload: { question: string; answer: string; followUp: string }): Promise<string>
      detectLlmProviders(): Promise<DetectedProvider[]>
      configureLlm(config: { provider: string; model?: string; endpoint?: string }): Promise<any>
      openInFolder(filePath: string): Promise<boolean>
      openFile(filePath: string): Promise<boolean>
      getTelemetry(): Promise<TelemetryEntry[]>
      pickDocument(): Promise<string | null>
      aiEdit(payload: { filePath: string; instruction: string; section?: string }): Promise<{ success: boolean; message: string }>
      listSnapshots(filePath: string): Promise<SnapshotEntry[]>
      restoreSnapshot(payload: { snapshotPath: string; targetPath: string }): Promise<boolean>
      createSnapshot(filePath: string): Promise<string | null>
      getPersonas(): Promise<Persona[]>
      savePersonas(personas: Persona[]): Promise<boolean>
    }
  }
}
