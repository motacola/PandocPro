import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

vi.mock('./ai-detector', () => ({
  detectProviders: async () => [
    { id: 'mock', name: 'MockProvider', available: true, requiresApiKey: false, priority: 1 },
  ],
  selectBestProvider: () => ({ id: 'mock', name: 'MockProvider', available: true, requiresApiKey: false, priority: 1 }),
}))

import { analyzeDocumentStructure } from './ai-analysis'

function createTempFile(filename: string, contents: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ai-analysis-'))
  const filePath = path.join(dir, filename)
  writeFileSync(filePath, contents, 'utf-8')
  return filePath
}

describe('analyzeDocumentStructure', () => {
  test('structure-only skips readability and recommendations', async () => {
    const filePath = createTempFile('sample.md', '# Title\n\nSome content here.')
    const result = await analyzeDocumentStructure(filePath, { analysisType: 'structure-only' })

    expect(result.success).toBe(true)
    expect(result.analysis?.readability.overallScore).toBe(0)
    expect(result.analysis?.recommendations.length).toBe(0)
  })

  test('quick returns a limited set of recommendations', async () => {
    const filePath = createTempFile('sample.md', '# Title\n\nSome content here.\n\nMore text to analyze.')
    const result = await analyzeDocumentStructure(filePath, { analysisType: 'quick' })

    expect(result.success).toBe(true)
    expect(result.analysis?.recommendations.length).toBeGreaterThanOrEqual(1)
    expect(result.analysis?.recommendations.length).toBeLessThanOrEqual(1)
  })
})
