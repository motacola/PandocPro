export interface DetectedProvider {
  id: string
  name: string
  available: boolean
  endpoint?: string
  model?: string
  requiresApiKey: boolean
  priority: number
  fallbackPriority?: number
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked?: Date
  responseTime?: number
}

const PROVIDERS = [
  { id: 'ollama', name: 'Ollama', endpoint: 'http://localhost:11434', checkPath: '/api/tags', priority: 1, requiresApiKey: false, fallbackPriority: 1 },
  { id: 'gemini', name: 'Google Gemini', priority: 2, requiresApiKey: true, fallbackPriority: 2 },
  { id: 'openai', name: 'ChatGPT (OpenAI)', priority: 3, requiresApiKey: true, fallbackPriority: 3 },
  { id: 'claude', name: 'Claude (Anthropic)', priority: 4, requiresApiKey: true, fallbackPriority: 4 },
  { id: 'deepseek', name: 'DeepSeek', priority: 5, requiresApiKey: true, fallbackPriority: 5 },
  { id: 'qwen', name: 'Qwen (Alibaba)', priority: 6, requiresApiKey: true, fallbackPriority: 6 },
  { id: 'mistral', name: 'Mistral AI', priority: 7, requiresApiKey: true, fallbackPriority: 7 },
  { id: 'perplexity', name: 'Perplexity', priority: 8, requiresApiKey: true, fallbackPriority: 8 },
  { id: 'grok', name: 'Grok (xAI)', priority: 9, requiresApiKey: true, fallbackPriority: 9 },
  { id: 'glm', name: 'GLM (Zhipu)', priority: 10, requiresApiKey: true, fallbackPriority: 10 },
  { id: 'lmstudio', name: 'LM Studio', endpoint: 'http://localhost:1234', checkPath: '/v1/models', priority: 11, requiresApiKey: false, fallbackPriority: 11 },
  { id: 'cohere', name: 'Cohere', priority: 12, requiresApiKey: true, fallbackPriority: 12 },
  { id: 'together', name: 'Together AI', priority: 13, requiresApiKey: true, fallbackPriority: 13 },
  { id: 'replicate', name: 'Replicate', priority: 14, requiresApiKey: true, fallbackPriority: 14 },
]

async function checkEndpoint(url: string, timeoutMs = 2000): Promise<{ available: boolean, responseTime?: number }> {
  const startTime = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    return { available: response.ok, responseTime }
  } catch {
    return { available: false }
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

  return keys.some(key => !!process.env[key])
}

export async function detectProviders(): Promise<DetectedProvider[]> {
  const results: DetectedProvider[] = []

  for (const provider of PROVIDERS) {
    let available = false
    let responseTime: number | undefined
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy'

    if (provider.endpoint && provider.checkPath) {
      // Local providers - check if running
      const url = `${provider.endpoint}${provider.checkPath}`
      const endpointCheck = await checkEndpoint(url)
      available = endpointCheck.available
      responseTime = endpointCheck.responseTime

      // Determine health status based on response time
      if (available && responseTime) {
        healthStatus = responseTime < 500 ? 'healthy' : responseTime < 1000 ? 'degraded' : 'unhealthy'
      }
    } else if (provider.requiresApiKey) {
      // Cloud providers - check for API key
      available = checkApiKey(provider.id)
      if (available) {
        healthStatus = 'healthy' // Assume healthy if API key is present
      }
    }

    results.push({
      id: provider.id,
      name: provider.name,
      available,
      endpoint: provider.endpoint,
      requiresApiKey: provider.requiresApiKey,
      priority: provider.priority,
      fallbackPriority: provider.fallbackPriority,
      healthStatus,
      lastChecked: new Date(),
      responseTime,
    })
  }

  // Sort by priority
  return results.sort((a, b) => a.priority - b.priority)
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
}

// Enhanced provider selection with fallback logic
export function selectBestProvider(providers: DetectedProvider[]): DetectedProvider | null {
  // First try to find an available provider with best priority
  const availableProviders = providers.filter(p => p.available)

  if (availableProviders.length === 0) {
    return null
  }

  // Sort by priority first, then by health status
  return availableProviders.sort((a, b) => {
    // First by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    // Then by health status (healthy > degraded > unhealthy)
    const healthOrder = { healthy: 1, degraded: 2, unhealthy: 3 }
    return (healthOrder[a.healthStatus || 'unhealthy'] || 3) - (healthOrder[b.healthStatus || 'unhealthy'] || 3)
  })[0]
}

// Fallback provider selection
export function getFallbackProvider(providers: DetectedProvider[], currentProviderId: string): DetectedProvider | null {
  const availableProviders = providers.filter(p => p.available && p.id !== currentProviderId)

  if (availableProviders.length === 0) {
    return null
  }

  // Sort by fallback priority
  return availableProviders.sort((a, b) => {
    return (a.fallbackPriority || a.priority) - (b.fallbackPriority || b.priority)
  })[0]
}

// Provider health monitoring
export async function monitorProviderHealth(_providers: DetectedProvider[]): Promise<DetectedProvider[]> {
  return await detectProviders() // Re-check all providers
}
