import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { detectProviders, getGeminiApiKey } from './ai-detector'

const require = createRequire(import.meta.url)

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const FAQ_PATH = path.join(PROJECT_ROOT, 'FAQ.md')

type FaqPayload = { question: string; answer: string; followUp: string }

type FaqHelper = {
  askFaqAi?: (projectRoot: string, payload: FaqPayload) => Promise<unknown> | unknown
  getLlmStatus?: (projectRoot: string) => unknown
}

let helper: FaqHelper | null = null

function ensureHelper() {
  if (helper) {
    return helper
  }
  try {
    helper = require(path.join(PROJECT_ROOT, 'scripts', 'lib', 'llm-helper.js'))
  } catch (error) {
    helper = null
  }
  return helper
}

export function registerFaqHandlers() {
  ipcMain.handle('faq:get', async () => {
    const content = await fs.readFile(FAQ_PATH, 'utf8')
    return content
  })

  ipcMain.handle('llm:status', () => {
    const loaded = ensureHelper()
    if (!loaded?.getLlmStatus) {
      return { configured: false }
    }
    try {
      return loaded.getLlmStatus(PROJECT_ROOT)
    } catch {
      return { configured: false }
    }
  })

  ipcMain.handle('faq:askAi', async (_event, payload: FaqPayload) => {
    const loaded = ensureHelper()
    if (!loaded?.askFaqAi) {
      throw new Error('LLM helper not available. Configure an AI provider first.')
    }
    return loaded.askFaqAi(PROJECT_ROOT, payload)
  })

  ipcMain.handle('llm:detect', async () => {
    return detectProviders()
  })

  ipcMain.handle('llm:configure', async (_event, config: { provider: string; model?: string; endpoint?: string }) => {
    const CONFIG_DIR = path.join(PROJECT_ROOT, 'config')
    const CONFIG_PATH = path.join(CONFIG_DIR, 'llm-selection.json')
    
    await fs.mkdir(CONFIG_DIR, { recursive: true })
    
    const fullConfig: {
      provider: string
      displayName: string
      model?: string
      endpoint?: string
      apiKey?: string
    } = {
      provider: config.provider,
      displayName: config.provider.charAt(0).toUpperCase() + config.provider.slice(1),
    }
    
    if (config.model) {
      fullConfig.model = config.model
    }
    
    if (config.endpoint) {
      fullConfig.endpoint = config.endpoint
    }
    
    // Add Gemini API key if configuring Gemini
    if (config.provider === 'gemini' || config.provider === 'google') {
      fullConfig.apiKey = getGeminiApiKey()
    }
    
    await fs.writeFile(CONFIG_PATH, JSON.stringify(fullConfig, null, 2), 'utf8')
    return fullConfig
  })
}
