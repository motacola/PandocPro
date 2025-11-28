import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import { BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import { notifySuccess, notifyError, notifyInfo } from './notifications'
import { telemetryIncrement } from './telemetry'

type ConvertMode = 'to-md' | 'to-docx' | 'auto' | 'to-pptx'

interface ConversionRequest {
  docxPath: string
  mdPath: string
  mode: ConvertMode
  requestId: string
  textOnly?: boolean
}

interface DocsListEntry {
  docx: string
  md: string
  mdExists: boolean
  docxMtime: number
  mdMtime: number | null
  docxSize: number
  mdSize: number | null
}

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const SETTINGS_FILE = path.join(process.env.HOME ?? '', '.config', 'pandocpro', 'settings.json')
const DEFAULT_DOCS_DIR = path.join(PROJECT_ROOT, 'docs')

function getDocsDir() {
  try {
    const contents = fs.readFileSync(SETTINGS_FILE, 'utf8')
    const parsed = JSON.parse(contents)
    if (parsed.docsPath && fs.existsSync(parsed.docsPath)) {
      return parsed.docsPath
    }
  } catch {
    // ignore missing config; fall back to default
  }
  return DEFAULT_DOCS_DIR
}
const DOCX_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'docx-sync.sh')

const processes = new Map<string, ChildProcessWithoutNullStreams>()

function scriptExists() {
  return fs.existsSync(DOCX_SCRIPT)
}

function validateRequest(payload: ConversionRequest) {
  if (!payload?.docxPath || !payload?.mdPath || !payload?.mode || !payload?.requestId) {
    throw new Error('Missing conversion parameters')
  }
  if (!['to-md', 'to-docx', 'auto', 'to-pptx'].includes(payload.mode)) {
    throw new Error(`Unsupported mode: ${payload.mode}`)
  }
}

function discoverDocs(): DocsListEntry[] {
  const docsDir = getDocsDir()
  if (!fs.existsSync(docsDir)) return []

  const entries: DocsListEntry[] = []
  const stack: string[] = [docsDir]

  while (stack.length > 0) {
    const current = stack.pop()!
    const dir = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of dir) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && /\.docx$/i.test(entry.name)) {
        const mdPath = fullPath.replace(/\.docx$/i, '.md')
        const docxStats = fs.statSync(fullPath)
        let mdMtime: number | null = null
        let mdSize: number | null = null
        const mdExists = fs.existsSync(mdPath)
        if (mdExists) {
          try {
            mdMtime = fs.statSync(mdPath).mtimeMs
            mdSize = fs.statSync(mdPath).size
          } catch {
            mdMtime = null
            mdSize = null
          }
        }
        entries.push({
          docx: fullPath,
          md: mdPath,
          mdExists,
          docxMtime: docxStats.mtimeMs,
          mdMtime,
          docxSize: docxStats.size,
          mdSize,
        })
      }
    }
  }

  return entries
}

export function registerConversionHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('docs:list', () => discoverDocs())

  ipcMain.on('conversion:start', (_event, payload: ConversionRequest) => {
    try {
      validateRequest(payload)
      if (!scriptExists()) {
        throw new Error(`Conversion script missing: ${DOCX_SCRIPT}`)
      }
    } catch (err) {
      getWindow()
        ?.webContents.send('conversion:error', {
          requestId: payload?.requestId,
          message: err instanceof Error ? err.message : String(err),
        })
      return
    }

    const args = [payload.docxPath, payload.mdPath, payload.mode]
    const child = spawn(DOCX_SCRIPT, args, {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        DOCSYNC_TEXT_ONLY: payload.textOnly ? '1' : '0',
      },
    })
    processes.set(payload.requestId, child)

    child.stdout.on('data', (chunk) => {
      getWindow()
        ?.webContents.send('conversion:stdout', {
          requestId: payload.requestId,
          chunk: chunk.toString(),
        })
    })

    child.stderr.on('data', (chunk) => {
      getWindow()
        ?.webContents.send('conversion:stderr', {
          requestId: payload.requestId,
          chunk: chunk.toString(),
        })
    })

    child.on('close', (code) => {
      processes.delete(payload.requestId)
      const win = getWindow()

      if (code === 0) {
        const filename = path.basename(payload.docxPath)
        notifySuccess('Conversion Complete', `${filename} processed successfully`, win ?? undefined)
        telemetryIncrement('conversion_success')
      } else {
        const filename = path.basename(payload.docxPath)
        notifyError('Conversion Failed', `${filename} failed with exit code ${code}`, win ?? undefined)
        telemetryIncrement('conversion_error')
      }

      win?.webContents.send('conversion:exit', {
        requestId: payload.requestId,
        code,
      })
    })

    child.on('error', (error) => {
      processes.delete(payload.requestId)
      const win = getWindow()
      notifyError('Conversion Error', error.message, win ?? undefined)
      telemetryIncrement('conversion_error')

      win?.webContents.send('conversion:error', {
        requestId: payload.requestId,
        message: error.message,
      })
    })
  })

  ipcMain.on('conversion:cancel', (_event, requestId: string) => {
    const child = processes.get(requestId)
    if (child) {
      child.kill('SIGTERM')
      processes.delete(requestId)
    }
  })
}
