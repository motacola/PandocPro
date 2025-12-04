import { BrowserWindow } from 'electron'

const GEMINI_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZWhtZnV4enFlamZtYnltdXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5ODc0NDUsImV4cCI6MjA2NjU2MzQ0NX0.6-Jxa15Du7RImhgbzn2P11oFc7wtttPjO2kobfg265c'

export interface DetectedProvider {
  id: string
  name: string
  available: boolean
  endpoint?: string
  model?: string
  requiresApiKey: boolean
  priority: number
}

const PROVIDERS = [
  { id: 'ollama', name: 'Ollama', endpoint: 'http://localhost:11434', checkPath: '/api/tags', priority: 1, requiresApiKey: false },
  { id: 'gemini', name: 'Google Gemini', priority: 2, requiresApiKey: true },
  { id: 'openai', name: 'ChatGPT (OpenAI)', priority: 3, requiresApiKey: true },
  { id: 'claude', name: 'Claude (Anthropic)', priority: 4, requiresApiKey: true },
  { id: 'deepseek', name: 'DeepSeek', priority: 5, requiresApiKey: true },
  { id: 'qwen', name: 'Qwen (Alibaba)', priority: 6, requiresApiKey: true },
  { id: 'mistral', name: 'Mistral AI', priority: 7, requiresApiKey: true },
  { id: 'perplexity', name: 'Perplexity', priority: 8, requiresApiKey: true },
  { id: 'grok', name: 'Grok (xAI)', priority: 9, requiresApiKey: true },
  { id: 'glm', name: 'GLM (Zhipu)', priority: 10, requiresApiKey: true },
  { id: 'lmstudio', name: 'LM Studio', endpoint: 'http://localhost:1234', checkPath: '/v1/models', priority: 11, requiresApiKey: false },
]

async function checkEndpoint(url: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

function checkApiKey(providerId: string): boolean {
  const keyMap: Record<string, string[]> = {
    gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    claude: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    deepseek: ['DEEPSEEK_API_KEY'],
    qwen: ['QWEN_API_KEY', 'ALIBABA_API_KEY'],
    mistral: ['MISTRAL_API_KEY'],
    perplexity: ['PERPLEXITY_API_KEY'],
    grok: ['GROK_API_KEY', 'XAI_API_KEY'],
    glm: ['GLM_API_KEY', 'ZHIPU_API_KEY'],
  }

  const keys = keyMap[providerId] || []
  
  // Special case: Gemini has hardcoded Supabase key
  if (providerId === 'gemini') {
    return true // We have the Supabase key
  }
  
  return keys.some(key => !!process.env[key])
}

export async function detectProviders(): Promise<DetectedProvider[]> {
  const results: DetectedProvider[] = []

  for (const provider of PROVIDERS) {
    let available = false

    if (provider.endpoint && provider.checkPath) {
      // Local providers - check if running
      const url = `${provider.endpoint}${provider.checkPath}`
      available = await checkEndpoint(url)
    } else if (provider.requiresApiKey) {
      // Cloud providers - check for API key
      available = checkApiKey(provider.id)
    }

    results.push({
      id: provider.id,
      name: provider.name,
      available,
      endpoint: provider.endpoint,
      requiresApiKey: provider.requiresApiKey,
      priority: provider.priority,
    })
  }

  // Sort by priority
  return results.sort((a, b) => a.priority - b.priority)
}

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || GEMINI_API_KEY
}
