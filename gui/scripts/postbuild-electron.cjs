#!/usr/bin/env node
const path = require('node:path')
const fs = require('node:fs')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '..')
const inputCjs = path.join(root, 'dist-electron', 'main', 'index.cjs')
const inputMjs = path.join(root, 'dist-electron', 'main', 'index.mjs')
const input = fs.existsSync(inputCjs) ? inputCjs : inputMjs
if (!input) {
  console.error('[postbuild-electron] Missing main bundle (index.cjs or index.mjs)')
  process.exit(1)
}

const source = fs.readFileSync(input, 'utf8')
const header = 'const __import_meta_url = require("node:url").pathToFileURL(__filename).href;\n'
const patched = header + source.replace(/import\.meta\.url/g, '__import_meta_url')

esbuild.transform(patched, {
  loader: 'js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
}).then((result) => {
  fs.writeFileSync(input, result.code, 'utf8')
  console.log('[postbuild-electron] Rewrote main process bundle as CommonJS')
}).catch((err) => {
  console.error('[postbuild-electron] transform failed', err)
  process.exit(1)
})
