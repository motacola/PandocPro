import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react'
import type { DetectedProvider } from '../type/pandoc-pro'
import './AiSetup.css'

interface AiSetupProps {
  onConfigured: () => void
}

export const AiSetup: React.FC<AiSetupProps> = ({ onConfigured }) => {
  const [providers, setProviders] = useState<DetectedProvider[]>([])
  const [isDetecting, setIsDetecting] = useState(true)
  const [configuringId, setConfiguringId] = useState<string | null>(null)

  useEffect(() => {
    detectProviders()
  }, [])

  const detectProviders = async () => {
    setIsDetecting(true)
    try {
      const detected = await window.pandocPro.detectLlmProviders()
      setProviders(detected)
    } catch (error) {
      console.error('Failed to detect providers:', error)
    } finally {
      setIsDetecting(false)
    }
  }

  const handleConfigure = async (provider: DetectedProvider) => {
    setConfiguringId(provider.id)
    try {
      const config: any = {
        provider: provider.id,
      }

      if (provider.endpoint) {
        config.endpoint = provider.endpoint
      }

      // Set default models for known providers
      if (provider.id === 'ollama') {
        config.model = 'llama3'
      } else if (provider.id === 'gemini') {
        config.model = 'gemini-pro'
      }

      await window.pandocPro.configureLlm(config)
      onConfigured()
    } catch (error: any) {
      alert(`Failed to configure ${provider.name}: ${error.message}`)
    } finally {
      setConfiguringId(null)
    }
  }

  const getProviderIcon = (id: string) => {
    const icons: Record<string, string> = {
      ollama: '🦙',
      gemini: '🔷',
      openai: '🤖',
      claude: '🎭',
      deepseek: '🌊',
      qwen: '🏮',
      mistral: '⚡',
      perplexity: '🔍',
      grok: '✖️',
      glm: '🌟',
      lmstudio: '💻',
    }
    return icons[id] || '🤖'
  }

  if (isDetecting) {
    return (
      <div className='ai-setup-loading'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
        <p>Detecting AI providers...</p>
      </div>
    )
  }

  const availableProviders = providers.filter(p => p.available)
  const unavailableProviders = providers.filter(p => !p.available)

  return (
    <div className='ai-setup'>
      <div className='ai-setup-header'>
        <Sparkles className='w-5 h-5' />
        <h3>AI Configuration</h3>
      </div>

      {availableProviders.length === 0 ? (
        <div className='ai-setup-empty'>
          <p>No AI providers detected.</p>
          <details>
            <summary>How to get started</summary>
            <ul>
              <li><strong>Ollama (Recommended):</strong> Install from <a href='https://ollama.com' target='_blank' rel='noreferrer'>ollama.com</a></li>
              <li><strong>Gemini:</strong> API key is pre-configured</li>
              <li><strong>OpenAI:</strong> Set OPENAI_API_KEY environment variable</li>
            </ul>
          </details>
        </div>
      ) : (
        <div className='provider-list'>
          <h4>✅ Available Providers</h4>
          {availableProviders.map((provider) => (
            <motion.div
              key={provider.id}
              className='provider-card available'
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className='provider-info'>
                <span className='provider-icon'>{getProviderIcon(provider.id)}</span>
                <div>
                  <div className='provider-name'>{provider.name}</div>
                  {provider.endpoint && (
                    <div className='provider-endpoint'>{provider.endpoint}</div>
                  )}
                </div>
              </div>
              <button
                className='btn-configure primary'
                onClick={() => handleConfigure(provider)}
                disabled={configuringId !== null}
              >
                {configuringId === provider.id ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Configuring...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='w-4 h-4' />
                    Use {provider.name}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {unavailableProviders.length > 0 && (
        <details className='unavailable-providers'>
          <summary>❌ Not Available ({unavailableProviders.length})</summary>
          <div className='provider-list'>
            {unavailableProviders.map((provider) => (
              <div key={provider.id} className='provider-card unavailable'>
                <div className='provider-info'>
                  <span className='provider-icon'>{getProviderIcon(provider.id)}</span>
                  <div className='provider-name'>{provider.name}</div>
                </div>
                <XCircle className='w-4 h-4 text-gray-400' />
              </div>
            ))}
          </div>
        </details>
      )}

      <button className='btn-refresh secondary' onClick={detectProviders}>
        Re-scan Providers
      </button>
    </div>
  )
}
