export type ConversionMode = 'to-md' | 'to-docx' | 'auto'

export interface ConversionStartPayload {
  docxPath: string
  mdPath: string
  mode: ConversionMode
  requestId: string
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

export interface DocsListEntry {
  docx: string
  md: string
  mdExists: boolean
  docxMtime: number
  mdMtime: number | null
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
}

export interface LlmStatus {
  configured: boolean
  provider?: string
  displayName?: string
  model?: string
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
      updateSettings(payload: Partial<SettingsData>): Promise<SettingsData>
      getFaq(): Promise<string>
      getLlmStatus(): Promise<LlmStatus>
      askFaqAi(payload: { question: string; answer: string; followUp: string }): Promise<string>
    }
  }
}
