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
    }
  }
}
