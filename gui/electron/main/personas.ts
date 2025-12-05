import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { ipcMain } from 'electron'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'pandocpro')
const PERSONAS_FILE = path.join(CONFIG_DIR, 'personas.json')

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

export interface Persona {
  id: string
  name: string
  instruction: string
  icon?: string // Lucide icon name or emoji? Let's use emoji for simplicity in JSON for now.
}

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'grammar-fixer',
    name: 'Fix Grammar',
    instruction: 'Fix grammar, spelling, and punctuation errors. Maintain the original tone.',
    icon: '✨'
  },
  {
    id: 'professional',
    name: 'Make Professional',
    instruction: 'Rewrite this text to be more professional, concise, and business-appropriate.',
    icon: '💼'
  },
  {
    id: 'simplify',
    name: 'Simplify',
    instruction: 'Rewrite this text to be simpler and easier to understand. Use plain language.',
    icon: 'baby' 
  },
  {
    id: 'critic',
    name: 'The Critic',
    instruction: 'Critique this text. Point out logical fallacies, weak arguments, or unclear sections. Do not rewrite, just comment.',
    icon: '🧐'
  }
]

export async function getPersonas(): Promise<Persona[]> {
  try {
    if (!fs.existsSync(PERSONAS_FILE)) {
      await savePersonas(DEFAULT_PERSONAS)
      return DEFAULT_PERSONAS
    }
    const data = await fs.promises.readFile(PERSONAS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Failed to load personas:', err)
    return DEFAULT_PERSONAS
  }
}

export async function savePersonas(personas: Persona[]): Promise<boolean> {
  try {
    await fs.promises.writeFile(PERSONAS_FILE, JSON.stringify(personas, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Failed to save personas:', err)
    return false
  }
}

export function registerPersonaHandlers() {
  ipcMain.handle('personas:list', () => getPersonas())
  ipcMain.handle('personas:save', (_, personas: Persona[]) => savePersonas(personas))
}
