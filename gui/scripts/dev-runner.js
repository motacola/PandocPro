#!/usr/bin/env node
import { spawn } from 'node:child_process'
import net from 'node:net'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE_PORT = Number(process.env.VITE_PORT || 5173)

function findOpenPort(start) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => {
      resolve(findOpenPort(start + 1))
    })
    server.once('listening', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.listen(start)
  })
}

function waitForDevServer(url, retries = 40, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      attempts += 1
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve(true)
          } else {
            retry()
          }
        })
        .on('error', retry)
    }
    const retry = () => {
      if (attempts >= retries) {
        reject(new Error(`Dev server not reachable at ${url}`))
        return
      }
      setTimeout(check, intervalMs)
    }
    check()
  })
}

async function start() {
  const port = await findOpenPort(BASE_PORT)
  const viteUrl = `http://localhost:${port}`
  const env = {
    ...process.env,
    VITE_PORT: String(port),
    PORT: String(port),
    VITE_DEV_SERVER_URL: viteUrl,
    ELECTRON_USER_DATA_DIR: process.env.ELECTRON_USER_DATA_DIR || '',
    ELECTRON_DEV_SKIP_LOCK: '1',
  }
  if (!env.ELECTRON_USER_DATA_DIR) {
    env.ELECTRON_USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pandocpro-electron-'))
  }
  try {
    fs.rmSync(path.join(env.ELECTRON_USER_DATA_DIR, 'SingletonLock'), { force: true })
  } catch {
    // ignore
  }
  delete env.ELECTRON_RUN_AS_NODE

  const vite = spawn('npm', ['run', 'dev:renderer'], { stdio: 'inherit', shell: true, env })
  let electronProc

  const cleanup = () => {
    if (vite && !vite.killed) vite.kill('SIGTERM')
    if (electronProc && !electronProc.killed) electronProc.kill('SIGTERM')
  }

  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })

  await waitForDevServer(viteUrl)
  electronProc = spawn('npx', ['electron', '.'], { stdio: 'inherit', shell: true, env })
  electronProc.on('exit', (code) => {
    cleanup()
    process.exit(code ?? 0)
  })
}

start().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
