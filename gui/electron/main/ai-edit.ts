import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { readSettings } from './settings'

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const AI_EDIT_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'ai-edit.js')

interface AiEditPayload {
  filePath: string
  instruction: string
  section?: string
  model?: string
}

export function registerAiEditHandlers() {
  ipcMain.handle('ai:edit-section', async (_event, payload: AiEditPayload) => {
    const { filePath, instruction, section, model } = payload

    if (!filePath || !instruction) {
      throw new Error('Missing filePath or instruction')
    }

    return new Promise((resolve, reject) => {
      const args = ['--file', filePath, '--instruction', instruction]
      if (section) {
        args.push('--section', section)
      }
      
      // We could pass model overrides here if script supports it, 
      // but for now script uses config/llm-selection.json
      
      console.log('🤖 Spawning AI Edit:', AI_EDIT_SCRIPT, args.join(' '))
 
      const child = spawn('node', [AI_EDIT_SCRIPT, ...args], {
        cwd: PROJECT_ROOT,
        env: { ...process.env }
      })
      
      // Cleanup handler to prevent EPIPE errors
      const cleanup = () => {
        if (!child.killed) {
          child.kill()
        }
      }
      
      // Handle parent process termination
      process.on('exit', cleanup)
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        // Remove cleanup handlers
        process.off('exit', cleanup)
        process.off('SIGINT', cleanup)
        process.off('SIGTERM', cleanup)
        
        if (code === 0) {
          resolve({ success: true, message: stdout })
        } else {
          try { console.error('AI Edit Failed:', stderr) } catch (e) { /* Ignore EPIPE */ }
          reject(new Error(`AI Edit process failed (code ${code}): ${stderr}`))
        }
      })
       
      child.on('error', (err) => {
        // Remove cleanup handlers
        process.off('exit', cleanup)
        process.off('SIGINT', cleanup)
        process.off('SIGTERM', cleanup)
        
        try { console.error('AI Edit process error:', err) } catch (e) { /* Ignore EPIPE */ }
        reject(err)
      })
    })
  })
}
