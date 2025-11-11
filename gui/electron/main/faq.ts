import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const FAQ_PATH = path.join(PROJECT_ROOT, 'FAQ.md')

let helper: { askFaqAi?: Function; getLlmStatus?: Function } | null = null

function ensureHelper() {
  if (helper) {
    return helper
  }
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
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

  ipcMain.handle('faq:askAi', async (_event, payload: { question: string; answer: string; followUp: string }) => {
    const loaded = ensureHelper()
    if (!loaded?.askFaqAi) {
      throw new Error('LLM helper not available. Configure an AI provider first.')
    }
    return loaded.askFaqAi(PROJECT_ROOT, payload)
  })
}
