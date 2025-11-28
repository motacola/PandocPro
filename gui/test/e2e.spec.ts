import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import readline from 'node:readline'
import net from 'node:net'
import { chromium, type Browser, type Page } from 'playwright'
import { beforeAll, afterAll, describe, expect, test } from 'vitest'

const root = path.join(__dirname, '..')
let electronProcess: ChildProcessWithoutNullStreams
let browser: Browser
let page: Page

if (process.platform === 'linux') {
  test(() => expect(true).true)
} else {
  beforeAll(async () => {
    const remotePort = await getAvailablePort()
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE
    env.NODE_ENV = 'development'
    env.ELECTRON_OPEN_DEVTOOLS = '1'
    env.PANDOCPRO_SKIP_UPDATER = '1'
    const electronBinary = path.join(root, 'node_modules', '.bin', 'electron')
    electronProcess = spawn(electronBinary, [`--remote-debugging-port=${remotePort}`, '.', '--no-sandbox'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const wsEndpoint = await waitForWsEndpoint(electronProcess)
    browser = await chromium.connectOverCDP(wsEndpoint)
    const [context] = browser.contexts()
    page = context.pages()[0] || (await context.waitForEvent('page'))
  })

  afterAll(async () => {
    if (page) {
      await page.screenshot({ path: 'test/screenshots/e2e.png' })
      await page.close()
    }
    await browser?.close()
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill()
    }
  })

  describe('[PandocPro GUI] e2e tests', () => {
    test('startup', async () => {
      const title = await page.title()
      expect(title).eq('PandocPro')
    })

    test('documents panel renders', async () => {
      const heading = await page.$('h1')
      const text = await heading?.textContent()
      expect(text).eq('PandocPro (Preview)')
      const documentsPanel = await page.$('section.panel h2')
      expect(await documentsPanel?.textContent()).toContain('Documents')
    })

    test('faq panel available', async () => {
      const faqPanel = await page.$('.faq-layout')
      expect(faqPanel).not.toBeNull()
    })
  })
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })
}

function waitForWsEndpoint(proc: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    const handleLine = (line: string) => {
      console.log('[electron]', line)
      const match = line.match(/DevTools listening on (ws:\/\/.*)/)
      if (match) {
        cleanup()
        resolve(match[1])
      }
    }

    const stdoutRl = readline.createInterface({ input: proc.stdout })
    const stderrRl = readline.createInterface({ input: proc.stderr })
    stdoutRl.on('line', handleLine)
    stderrRl.on('line', handleLine)

    const cleanup = () => {
      stdoutRl.close()
      stderrRl.close()
    }

    proc.on('exit', (code) => {
      cleanup()
      reject(new Error(`Electron exited before providing DevTools endpoint (code ${code})`))
    })
  })
}
