#!/usr/bin/env node
const path = require('node:path')
const fs = require('node:fs')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '..')
const inputCjs = path.join(root, 'dist-electron', 'main', 'index.cjs')
if (!fs.existsSync(inputCjs)) {
  console.error('[postbuild-electron] Missing main bundle (index.cjs)')
  process.exit(1)
}

const source = fs.readFileSync(inputCjs, 'utf8')
const header = 'const __import_meta_url = require("node:url").pathToFileURL(__filename).href;\n'
const patched = header + source.replace(/import\.meta\.url/g, '__import_meta_url')

esbuild.transform(patched, {
  loader: 'js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
}).then((result) => {
  fs.writeFileSync(inputCjs, result.code, 'utf8')
  console.log('[postbuild-electron] Rewrote main process bundle as CommonJS')
}).catch((err) => {
  console.error('[postbuild-electron] transform failed', err)
  process.exit(1)
})
