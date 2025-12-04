#!/usr/bin/env node
// Shared helpers for FAQ AI integrations (CLI + GUI)

const fs = require('node:fs')
const path = require('node:path')

const fetchFn = typeof fetch === 'function'
  ? fetch.bind(globalThis)
  : null

function requireFetch() {
  if (fetchFn) {
    return fetchFn
  }
  throw new Error('This feature requires Node 18+ (fetch API).')
}

function getConfigPath(projectRoot) {
  return path.join(projectRoot, 'config', 'llm-selection.json')
}

function loadConfig(projectRoot) {
  try {
    const file = fs.readFileSync(getConfigPath(projectRoot), 'utf8')
    return JSON.parse(file)
  } catch {
    return null
  }
}

function getLlmStatus(projectRoot) {
  const cfg = loadConfig(projectRoot)
  if (!cfg) {
    return { configured: false }
  }
  return {
    configured: true,
    provider: cfg.provider || 'custom',
    displayName: cfg.displayName || cfg.provider || 'LLM',
    model: cfg.model || '',
  }
}

function buildPrompt(question, answer, followUp) {
  return (
    'You are the PandocPro documentation assistant. Use the FAQ context to answer clearly.\n' +
    `FAQ question: ${question}\n` +
    `Official answer: ${answer}\n` +
    `User follow-up: ${followUp || question}`
  )
}

function normalizeBase(url) {
  if (!url) {
    return ''
  }
  return url.replace(/\/$/, '')
}

async function callOllama(cfg, prompt) {
  const fetch = requireFetch()
  const base = normalizeBase(cfg.endpoint || 'http://localhost:11434')
  let apiRoot = base.includes('/api') ? base : `${base}/api`
  apiRoot = apiRoot.replace(/\/$/, '')
  const chatUrl = `${apiRoot}/chat`
  const body = {
    model: cfg.model || 'llama3',
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  }
  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Ollama request failed (${res.status})`)
  }
  const data = await res.json()
  const content = data?.message?.content || data?.response
  if (!content) {
    throw new Error('Ollama returned an empty response.')
  }
  return String(content).trim()
}

async function callOpenAiStyle(cfg, prompt) {
  const fetch = requireFetch()
  let base = normalizeBase(cfg.endpoint || 'http://localhost:1234/v1')
  if (!base.endsWith('/chat/completions')) {
    base = `${base}/chat/completions`
  }
  const headers = { 'Content-Type': 'application/json' }
  const apiKey = process.env.FAQ_AI_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  const body = {
    model: cfg.model || 'local-model',
    messages: [
      { role: 'system', content: 'You are a concise documentation assistant for PandocPro.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    stream: false,
  }
  const res = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `Request failed (${res.status})`
    throw new Error(msg)
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Model returned no content.')
  }
  return String(content).trim()
}

async function callGemini(cfg, prompt) {
  const fetch = requireFetch()
  const apiKey = cfg.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not found')
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || 'gemini-pro'}:generateContent?key=${apiKey}`
  
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  }
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data?.error?.message || `Gemini request failed (${res.status})`
    throw new Error(msg)
  }
  
  const data = await res.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) {
    throw new Error('Gemini returned no content.')
  }
  return String(content).trim()
}

async function askFaqAi(projectRoot, { question, answer, followUp }) {
  const cfg = loadConfig(projectRoot)
  if (!cfg) {
    throw new Error('LLM not configured. Run ./scripts/configure-llm.sh first.')
  }
  const prompt = buildPrompt(question, answer, followUp)
  
  const provider = (cfg.provider || '').toLowerCase()
  
  if (provider === 'ollama') {
    return callOllama(cfg, prompt)
  }
  
  if (provider === 'gemini' || provider === 'google') {
    return callGemini(cfg, prompt)
  }
  
  // All other providers use OpenAI-compatible API
  // (OpenAI, Claude, DeepSeek, Qwen, Mistral, Perplexity, Grok, GLM, LM Studio)
  return callOpenAiStyle(cfg, prompt)
}

module.exports = {
  askFaqAi,
  getLlmStatus,
  loadConfig,
}
