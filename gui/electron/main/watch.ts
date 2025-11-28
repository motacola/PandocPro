import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import { notifyInfo, notifyError } from './notifications'
import { telemetryIncrement } from './telemetry'

const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const WATCH_SCRIPT = path.join(PROJECT_ROOT, 'watch-md.js')

let currentWatch: ChildProcessWithoutNullStreams | null = null
let currentStatus: {
  docxPath: string
  mdPath: string
  running: boolean
  lastSync: string | null
} | null = null

export function registerWatchHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('watch:start', (_event, payload: { docxPath: string; mdPath: string }) => {
    if (currentWatch) {
      currentWatch.kill('SIGTERM')
      currentWatch = null
    }

    currentStatus = {
      docxPath: payload.docxPath,
      mdPath: payload.mdPath,
      running: true,
      lastSync: null,
    }

    const child = spawn('node', [WATCH_SCRIPT], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        DOCX_FILE: payload.docxPath,
        MD_FILE: payload.mdPath,
      },
    })
    currentWatch = child
    getWindow()?.webContents.send('watch:update', {
      ...currentStatus,
      mode: 'running',
    })

    const notify = (message: string) => {
      getWindow()?.webContents.send('watch:update', {
        ...currentStatus,
        running: true,
        lastSync: currentStatus?.lastSync ?? null,
        message,
        mode: 'running',
      })
    }

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      if (text.includes('Export complete')) {
        currentStatus = {
          ...(currentStatus ?? payload),
          running: true,
          lastSync: new Date().toISOString(),
        }
        notifyInfo('Watch export complete', path.basename(payload.mdPath), getWindow() ?? undefined)
        telemetryIncrement('conversion_success')
      }
      notify(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      notify(text)
      notifyError('Watch error', text, getWindow() ?? undefined)
      telemetryIncrement('watch_error')
    })

    child.on('close', () => {
      getWindow()?.webContents.send('watch:update', {
        ...(currentStatus ?? payload),
        running: false,
        mode: 'paused',
      })
      currentWatch = null
      currentStatus = currentStatus ? { ...currentStatus, running: false } : null
    })
  })

  ipcMain.handle('watch:stop', () => {
    if (currentWatch) {
      currentWatch.kill('SIGTERM')
      currentWatch = null
      getWindow()?.webContents.send('watch:update', {
        ...(currentStatus ?? {}),
        running: false,
        mode: 'paused',
      })
      currentStatus = currentStatus ? { ...currentStatus, running: false } : null
    }
  })
}
