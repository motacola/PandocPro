import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

type Provider = {
  id: string
  name: string
  available: boolean
  requiresApiKey: boolean
  priority: number
}

const detectorState: {
  providers: Provider[]
  bestProvider: Provider | null
} = {
  providers: [],
  bestProvider: null,
}

vi.mock('../electron/main/ai-detector', () => ({
  detectProviders: vi.fn(async () => detectorState.providers),
  selectBestProvider: vi.fn(() => detectorState.bestProvider),
}))

type ProjectSetup = {
  root: string
  markdownPath: string
}

function createProject(helperSource: string, config: { provider: string; model?: string; endpoint?: string }): ProjectSetup {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-analysis-project-'))
  const scriptsDir = path.join(root, 'scripts', 'lib')
  const configDir = path.join(root, 'config')
  const docsDir = path.join(root, 'docs')

  mkdirSync(scriptsDir, { recursive: true })
  mkdirSync(configDir, { recursive: true })
  mkdirSync(docsDir, { recursive: true })

  writeFileSync(path.join(scriptsDir, 'llm-helper.js'), helperSource, 'utf-8')
  writeFileSync(path.join(configDir, 'llm-selection.json'), JSON.stringify(config, null, 2), 'utf-8')

  const markdownPath = path.join(docsDir, 'sample.md')
  writeFileSync(
    markdownPath,
    '# Title\n\nThis is a sample paragraph for testing.\n\n## Details\n\nMore content in another section.',
    'utf-8'
  )

  return { root, markdownPath }
}

async function importAnalysisModule() {
  vi.resetModules()
  return await import('../electron/main/ai-analysis')
}

describe('analyzeDocumentStructure contracts', () => {
  const originalAppRoot = process.env.APP_ROOT
  const originalTimeout = process.env.AI_ANALYSIS_TIMEOUT_MS
  const cleanupPaths: string[] = []

  beforeEach(() => {
    detectorState.providers = [
      { id: 'ollama', name: 'Ollama', available: true, requiresApiKey: false, priority: 1 },
    ]
    detectorState.bestProvider = detectorState.providers[0]
    delete process.env.AI_ANALYSIS_TIMEOUT_MS
  })

  afterEach(() => {
    process.env.APP_ROOT = originalAppRoot
    process.env.AI_ANALYSIS_TIMEOUT_MS = originalTimeout
    while (cleanupPaths.length > 0) {
      const target = cleanupPaths.pop()
      if (target) {
        rmSync(target, { recursive: true, force: true })
      }
    }
  })

  test('uses provider output when valid JSON is returned', async () => {
    const helperSource = `
      module.exports = {
        loadConfig() { return { provider: 'ollama' } },
        async generateResponse() {
          return JSON.stringify({
            readability: { overallScore: 92, fleschReadingEase: 70, fleschKincaidGrade: 7, gunningFogIndex: 8, colemanLiauIndex: 9, automatedReadabilityIndex: 8 },
            recommendations: [{ type: 'content', severity: 'low', description: 'Keep concise summaries', suggestion: 'Add a one-line summary per section.' }],
            language: 'english'
          })
        }
      }
    `

    const project = createProject(helperSource, { provider: 'ollama' })
    cleanupPaths.push(project.root)
    process.env.APP_ROOT = path.join(project.root, 'gui')

    const { analyzeDocumentStructure } = await importAnalysisModule()
    const result = await analyzeDocumentStructure(project.markdownPath, { analysisType: 'full' })

    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('ollama')
    expect(result.analysis?.readability.overallScore).toBe(92)
    expect(result.analysis?.recommendations[0]?.type).toBe('content')
  })

  test('falls back to deterministic analysis when provider response is malformed', async () => {
    const helperSource = `
      module.exports = {
        loadConfig() { return { provider: 'ollama' } },
        async generateResponse() { return 'not-json-response' }
      }
    `

    const project = createProject(helperSource, { provider: 'ollama' })
    cleanupPaths.push(project.root)
    process.env.APP_ROOT = path.join(project.root, 'gui')

    const { analyzeDocumentStructure } = await importAnalysisModule()
    const result = await analyzeDocumentStructure(project.markdownPath, { analysisType: 'quick' })

    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('deterministic')
    expect(result.analysis?.recommendations.length).toBe(1)
    expect(result.analysis?.metadata.wordCount).toBeGreaterThan(0)
  })

  test('falls back to deterministic analysis when provider times out', async () => {
    const helperSource = `
      module.exports = {
        loadConfig() { return { provider: 'ollama' } },
        async generateResponse() { return new Promise(() => {}) }
      }
    `

    const project = createProject(helperSource, { provider: 'ollama' })
    cleanupPaths.push(project.root)
    process.env.APP_ROOT = path.join(project.root, 'gui')
    process.env.AI_ANALYSIS_TIMEOUT_MS = '25'

    const { analyzeDocumentStructure } = await importAnalysisModule()
    const result = await analyzeDocumentStructure(project.markdownPath, { analysisType: 'full' })

    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('deterministic')
    expect(result.analysis?.readability.overallScore).toBeGreaterThanOrEqual(0)
  })
})
